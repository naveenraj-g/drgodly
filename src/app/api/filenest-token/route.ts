/**
 * POST /api/filenest-token
 *
 * Layer: presentation / API route
 *
 * Generates a short-lived FileNest upload token for use by the browser-side
 * @filenest/react SDK. The token scopes the upload to a per-patient folder so
 * files land in the right place without exposing the API key to the client.
 *
 * Folder path convention:
 *   - Patient exists  →  "{patientFhirId}-{userId}/profile"
 *   - No patient yet  →  "{userId}/profile"
 *
 * `ensurePath` idempotently creates missing path segments and returns the
 * leaf folder ID, which is then embedded in the upload token so the FileNest
 * storage server places the file in the correct folder automatically.
 *
 * Query params:
 *   patientFhirId  — optional numeric FHIR patient ID
 *
 * Response: UploadToken { token, expiresAt, constraints }
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import { filenest } from "@/lib/filenest.server";

export async function POST(req: Request): Promise<Response> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // ── Read optional patientFhirId from query params ─────────────────────────
  const { searchParams } = new URL(req.url);
  const patientFhirIdParam = searchParams.get("patientFhirId");
  const patientFhirId = patientFhirIdParam ? Number(patientFhirIdParam) : null;

  // ── Build folder path and ensure it exists ────────────────────────────────
  // Two-level path: "{patientFhirId}-{userId}" (or just "{userId}") → "profile"
  // ensurePath creates missing segments idempotently — safe to call on every upload.
  const rootSegment =
    patientFhirId != null ? `${patientFhirId}-${userId}` : userId;
  const folderPath = `${rootSegment}/profile`;

  const folder = await filenest.folders.ensurePath(folderPath);

  // ── Generate scoped upload token ──────────────────────────────────────────
  const token = await filenest.uploadTokens.create({
    folderId: folder.id,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSize: 5 * 1024 * 1024, // 5 MB
    maxFiles: 1,
    expiresIn: 600, // 10 minutes
    ownerUserId: userId,
    metadata: { patientFhirId: patientFhirId ?? undefined },
  });

  return Response.json(token);
}
