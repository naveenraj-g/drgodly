/**
 * Patient profile photo server actions — save and retrieve local photo metadata.
 *
 * Layer: presentation / actions
 * Resource: PatientPhoto (local Postgres, not FHIR)
 *
 * Unlike the FHIR patient photo actions (photos.actions.ts), these actions
 * operate against the local `patient_photos` table in Prisma. The table stores
 * only the FileNest file metadata (file_id, filename, etc.); actual bytes live
 * in FileNest storage.
 *
 * Actions:
 *  - savePatientPhotoAction  — upsert a photo record after a successful upload
 *  - getPatientPhotoAction   — fetch the current user's photo record
 */

"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { authenticatedProcedure } from "../procedures";

/**
 * Upserts a patient profile photo record after a FileNest upload completes.
 * Keyed by user_id — re-uploading replaces the previous file reference.
 *
 * @param fileId      - FileNest file ID returned by the upload.
 * @param filename    - Original filename.
 * @param contentType - MIME type (e.g. "image/jpeg").
 * @param sizeBytes   - File size in bytes.
 * @returns The upserted PatientPhoto record.
 */
export const savePatientPhotoAction = authenticatedProcedure
  .createServerAction()
  .input(
    z.object({
      fileId: z.string().min(1),
      filename: z.string().min(1),
      contentType: z.string().min(1),
      sizeBytes: z.number().int().positive(),
    }),
  )
  .handler(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;

    return await prisma.patientPhoto.upsert({
      where: { user_id: userId },
      update: {
        file_id: input.fileId,
        filename: input.filename,
        content_type: input.contentType,
        size_bytes: input.sizeBytes,
      },
      create: {
        user_id: userId,
        file_id: input.fileId,
        filename: input.filename,
        content_type: input.contentType,
        size_bytes: input.sizeBytes,
      },
    });
  });

/**
 * Fetches the authenticated user's current profile photo record.
 * Returns null if no photo has been uploaded yet.
 *
 * @returns The PatientPhoto record or null.
 */
export const getPatientPhotoAction = authenticatedProcedure
  .createServerAction()
  .handler(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await prisma.patientPhoto.findUnique({
      where: { user_id: userId },
    });
  });
