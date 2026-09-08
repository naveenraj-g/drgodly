/**
 * registerStagingMedicalRecords — puts a batch of just-uploaded result files
 * on the AI extraction pipeline's work queue.
 *
 * Layer: client / telemedicine / shared / components / clinical
 *
 * Called right after a result upload has already written its DiagnosticReport
 * + DocumentReference(s) — from both UploadResultModal (patient) and
 * UploadOrderResultModal (doctor), so an uploaded result is queued for
 * extraction no matter which side attached it.
 *
 * One staging record is created per file (status defaults to "pending" on the
 * staging-area service, which is what puts it on the agent's queue). This is
 * deliberately best-effort: the upload itself has already succeeded by the
 * time this runs, and a staging-area outage should not roll that back or
 * surface as an upload failure to the user — it only means the AI review tab
 * for that file stays empty until it's retried.
 */
import { getServiceRequestByIdAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { getEncounterByIdAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { createStagingMedicalRecordAction } from "@/modules/server/presentation/actions/staging-medical-record";
import type { FileRecord } from "@filenest-fs/react";

/** Reads sizeBytes from a FileRecord — the SDK's final fetch uses snake_case at runtime. */
function getSize(record: FileRecord): number | undefined {
  const raw = record as unknown as Record<string, unknown>;
  return (record.sizeBytes ?? (raw["size_bytes"] as number | undefined)) as
    | number
    | undefined;
}

/** Reads contentType from a FileRecord (same snake_case / camelCase caveat). */
function getContentType(record: FileRecord): string | undefined {
  const raw = record as unknown as Record<string, unknown>;
  return (record.contentType ?? (raw["content_type"] as string | undefined)) as
    | string
    | undefined;
}

interface RegisterStagingMedicalRecordsParams {
  /** Successfully uploaded FileNest records for this batch. */
  records: FileRecord[];
  /** The order the results were uploaded against. */
  serviceRequestId: number;
  /** The DiagnosticReport just created for this batch, if it succeeded. */
  diagnosticReportId?: number;
  /** FHIR Patient.id. */
  patientFhirId?: number;
  /** Active organisation id — forwarded as a trusted field, this service does not authenticate. */
  orgId?: string;
  /** Session user id — forwarded as a trusted field. */
  userId?: string;
  /** Who attached the file — recorded as StagingMedicalRecord.created_by. */
  createdBy: "patient" | "doctor";
}

/**
 * Registers one staging record per uploaded file.
 *
 * Looks up the order's encounter_id (ServiceRequests already carry it), then
 * the encounter's own appointment reference, rather than threading two more
 * props through every call site that can open the upload modals.
 *
 * @param params - See RegisterStagingMedicalRecordsParams.
 */
export async function registerStagingMedicalRecords({
  records,
  serviceRequestId,
  diagnosticReportId,
  patientFhirId,
  orgId,
  userId,
  createdBy,
}: RegisterStagingMedicalRecordsParams): Promise<void> {
  try {
    const [order] = await getServiceRequestByIdAction({
      payload: { id: serviceRequestId },
    });
    const encounterId = order?.encounter_id ?? undefined;

    let appointmentId: number | undefined;
    if (encounterId != null) {
      const [encounter] = await getEncounterByIdAction({
        payload: { id: encounterId },
      });
      appointmentId = encounter?.appointment?.[0]?.reference_id ?? undefined;
    }

    await Promise.allSettled(
      records.map((r) =>
        createStagingMedicalRecordAction({
          payload: {
            file_id: r.id,
            attachment_content_type: getContentType(r),
            attachment_size: getSize(r),
            attachment_title: r.filename,
            org_id: orgId,
            user_id: userId,
            patient_id: patientFhirId,
            appointment_id: appointmentId,
            encounter_id: encounterId,
            service_request_id: serviceRequestId,
            diagnostic_report_id: diagnosticReportId,
            created_by: createdBy,
          },
        }),
      ),
    );
  } catch (err) {
    // Best-effort — the upload itself already succeeded; only the AI review
    // queue misses this batch. Logged for visibility, not surfaced to the user.
    console.error("registerStagingMedicalRecords failed", err);
  }
}
