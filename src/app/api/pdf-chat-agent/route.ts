/**
 * /api/pdf-chat-agent — proxy to the "pdf_chat" document-chat agent microservice.
 *
 * Layer: app / api
 *
 * Temporary alternate to /api/document-agent, backing the new PdfChatPanel
 * component. Unlike the document agent (which takes a `file_id` and looks the
 * document up itself), this agent expects the raw file bytes uploaded as
 * multipart/form-data: a `message` field (the doctor's question) and a `file`
 * field (the actual document). The browser only ever has a FileNest fileId, so
 * this route resolves that fileId to bytes + filename/mimeType server-side
 * (via the FileNest SDK) and builds the multipart body here before forwarding
 * to PDF_CHAT_AGENT_API_URL.
 *
 * Response is streamed straight back through, byte for byte, same as
 * /api/document-agent — the upstream emits one JSON object per event
 * (`text_delta` / `text_complete`), which PdfChatPanel parses incrementally.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { filenest } from "@/lib/filenest.server";

/** Body the browser sends — just enough to resolve the file and ask the question. */
interface PdfChatRequestBody {
  file_id: string;
  message: string;
}

/**
 * Resolves a FileNest fileId to bytes, forwards `{ message, file }` as
 * multipart/form-data to PDF_CHAT_AGENT_API_URL, and streams the response back.
 *
 * @param req - Body is `{ file_id, message }`.
 * @returns The upstream's streamed body, or a JSON error if the request could not be made.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const { file_id, message } = (await req.json()) as PdfChatRequestBody;

    if (!file_id || !message) {
      return NextResponse.json(
        { error: "file_id and message are required" },
        { status: 400 },
      );
    }

    const agentUrl = process.env.PDF_CHAT_AGENT_API_URL;
    if (!agentUrl) {
      return NextResponse.json(
        { error: "PDF_CHAT_AGENT_API_URL is not configured" },
        { status: 500 },
      );
    }

    // Resolve the FileNest fileId to its bytes + metadata — the upstream agent
    // wants the actual file in the request, not a reference to it.
    const [fileRecord, fileBuffer] = await Promise.all([
      filenest.files.get(file_id),
      filenest.files.downloadToBuffer(file_id),
    ]);

    const formData = new FormData();
    formData.append("message", message);
    formData.append(
      "file",
      new Blob([new Uint8Array(fileBuffer)], {
        type: fileRecord.contentType || "application/octet-stream",
      }),
      fileRecord.filename,
    );

    const upstream = await fetch(agentUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Agent request failed" },
        { status: upstream.status },
      );
    }

    if (!upstream.body) {
      return NextResponse.json({ error: "No response body" }, { status: 500 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    if (err.message?.includes("Failed to fetch agent token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[pdf-chat-agent] proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
