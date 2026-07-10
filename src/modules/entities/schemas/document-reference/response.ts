/**
 * DocumentReference response schemas.
 * Layer: entities / schemas / document-reference
 * Mirrors the fhir-gql plain JSON response shape. All fields are .nullish()
 * for forward-compatibility with fhir-server additions.
 */
import { z } from "zod";

// ── Child array response schemas ──────────────────────────────────────────────

const AttachmentResponseSchema = z.object({
  content_type: z.string().nullish(),
  language: z.string().nullish(),
  /** FilNest fileId — resolve to presigned URL via /api/filenest-download-url?fileId={url}. */
  url: z.string().nullish(),
  size: z.number().nullish(),
  hash: z.string().nullish(),
  title: z.string().nullish(),
  creation: z.string().nullish(),
});

const ContentResponseSchema = z.object({
  id: z.number().nullish(),
  attachment: AttachmentResponseSchema.nullish(),
  format_system: z.string().nullish(),
  format_version: z.string().nullish(),
  format_code: z.string().nullish(),
  format_display: z.string().nullish(),
});

// ── Top-level response schemas ────────────────────────────────────────────────

export const DocumentReferenceResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  status: z.string().nullish(),
  doc_status: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  date: z.string().nullish(),
  description: z.string().nullish(),
  authenticator: z.string().nullish(),
  authenticator_display: z.string().nullish(),
  custodian: z.string().nullish(),
  custodian_display: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  content: z.array(ContentResponseSchema).nullish(),
  authors: z.array(z.record(z.any())).nullish(),
  security_labels: z.array(z.record(z.any())).nullish(),
  identifiers: z.array(z.record(z.any())).nullish(),
  categories: z.array(z.record(z.any())).nullish(),
  relates_to: z.array(z.record(z.any())).nullish(),
  context: z.record(z.any()).nullish(),
});
export type TDocumentReferenceResponse = z.infer<typeof DocumentReferenceResponseSchema>;

export const PaginatedDocumentReferenceResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(DocumentReferenceResponseSchema),
});
export type TPaginatedDocumentReferenceResponse = z.infer<typeof PaginatedDocumentReferenceResponseSchema>;
