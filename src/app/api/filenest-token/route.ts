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
 * Folder lookup strategy: `getByPath` is called first — if the full path
 * already exists the existing folder is reused with no write to FileNest.
 * Only when the path is absent does `ensurePath` run to create the missing
 * segments. The resolved folder ID is embedded in the upload token so
 * FileNest places the file in the correct folder automatically.
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

  // ── Resolve or create the upload folder ──────────────────────────────────
  // Path: "{patientFhirId}-{userId}/profile" (or "{userId}/profile" in create mode).
  // Check via getByPath first — if the full path already exists, reuse it without
  // touching the API again. Only call ensurePath (which creates missing segments)
  // when the folder is genuinely absent.
  const rootSegment =
    patientFhirId != null ? `${patientFhirId}-${userId}` : userId;
  const folderPath = `${rootSegment}/profile`;

  const existing = await filenest.folders.getByPath(folderPath);
  const folder = existing ?? (await filenest.folders.ensurePath(folderPath));

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
