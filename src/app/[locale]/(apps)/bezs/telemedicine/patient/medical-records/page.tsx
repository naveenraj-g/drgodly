/**
 * Patient Medical Records page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/medical-records
 *
 * Server component. Guards:
 *   1. Redirects to /login if no session.
 *   2. Redirects to /patient/profile if no FHIR Patient record (requirePatientProfile).
 *
 * Data flow (parallel SSR fetch):
 *   • listServiceRequestsAction  — all doctor orders for this patient
 *   • listDiagnosticReportsAction — all uploaded result sets for this patient
 *   • getMyAppointmentsAction    — all appointments (for encounter → doctor/date context)
 *
 * The page passes raw arrays to MedicalRecordsClient which builds the
 * cross-reference maps client-side (no N+1 requests). The UploadResultModal
 * is already mounted in the patient layout — no extra wiring needed here.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { listServiceRequestsAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { listDiagnosticReportsAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { MedicalRecordsClient } from "@/modules/client/telemedicine/patient/component/medical-records/MedicalRecordsClient";
import type { TPaginatedServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";

/** Force dynamic rendering — patient data must never be statically cached. */
export const dynamic = "force-dynamic";

/**
 * Medical Records page server component.
 *
 * Pre-fetches all ServiceRequests, DiagnosticReports, and Appointments in
 * parallel so MedicalRecordsClient can render the full record list on first paint.
 * Falls back to empty arrays on action failure to avoid blocking the page.
 */
export default async function PatientMedicalRecordsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  /* requirePatientProfile redirects to /patient/profile if no FHIR record. */
  const patient = await requirePatientProfile();

  /* Fetch all three data sets in parallel to minimise TTFB. */
  const [[serviceRequestsPage], [diagnosticReportsPage], [appointmentsPage]] =
    await Promise.all([
      listServiceRequestsAction({
        payload: { patient_id: patient.id, limit: 200 },
      }),
      listDiagnosticReportsAction({
        payload: { patient_id: patient.id, limit: 200 },
      }),
      getMyAppointmentsAction({
        payload: { limit: 200, offset: 0 },
      }),
    ]);

  /* Safe empty fallbacks — page still renders if any action fails. */
  const serviceRequests =
    (serviceRequestsPage as TPaginatedServiceRequestResponse | null)?.data ?? [];
  const diagnosticReports =
    (diagnosticReportsPage as TPaginatedDiagnosticReportResponse | null)?.data ?? [];
  const appointments =
    (appointmentsPage as TPaginatedAppointmentResponse | null)?.data ?? [];

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Medical Records</h1>
        <p className="text-sm text-muted-foreground">
          Manage your test orders, lab results, and uploaded documents.
        </p>
      </div>

      {/* ── Interactive client shell ────────────────────────────────────────── */}
      <MedicalRecordsClient
        serviceRequests={serviceRequests}
        diagnosticReports={diagnosticReports}
        appointments={appointments}
      />
    </div>
  );
}
