/**
 * Clinical Records — clinical workspace page (step 3 of 3).
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/clinical-records/[patientId]/[appointmentId]
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Data flow:
 *  1. In parallel: appointment, consultation (the staging row), and every
 *     encounter for the appointment.
 *  2. Once the encounter is known, in parallel: the four published FHIR
 *     resource lists plus DiagnosticReports and DocumentReferences.
 *  3. All of it is handed to ClinicalWorkspace, which decides what to seed the
 *     editors from (published records → staged draft → AI report).
 *
 * Unlike the post-consultation review page this keeps *all* encounters rather
 * than just the first, so the Timeline tab can show every one the visit produced.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { getIntakeByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/intake";
import { listEncountersAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { listConditionsAction } from "@/modules/server/presentation/actions/condition/core.actions";
import { listObservationsAction } from "@/modules/server/presentation/actions/observation/core.actions";
import { listMedicationRequestsAction } from "@/modules/server/presentation/actions/medication-request/core.actions";
import { listServiceRequestsAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { listDiagnosticReportsAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { listDocumentReferencesAction } from "@/modules/server/presentation/actions/document-reference";
import { getPatientByIdAction } from "@/modules/server/presentation/actions/patient";
import { getMyOrganizationAction } from "@/modules/server/presentation/actions/organization";
import { listPractitionerQualificationsAction } from "@/modules/server/presentation/actions/practitioner";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";
import { getParticipantName } from "@/modules/server/presentation/helpers/doctorPatients";
import { ClinicalWorkspace } from "@/modules/client/telemedicine/doctor/component/clinical-records/ClinicalWorkspace";
import { VisitOverview } from "@/modules/client/telemedicine/doctor/component/clinical-records/VisitOverview";
import { BackButton } from "@/modules/client/telemedicine/shared/components/BackButton";
import { DoctorModalProvider } from "@/modules/client/telemedicine/doctor/provider/DoctorModalProvider";
import {
  buildOrgLetterhead,
  buildPractitionerLetterhead,
  buildPatientLetterhead,
} from "@/modules/client/telemedicine/doctor/component/clinical-records/exportDocument";
import { Card, CardContent } from "@/components/ui/card";

import type { TPaginatedEncounterResponse } from "@/modules/entities/schemas/encounter";
import type { TPaginatedConditionResponse } from "@/modules/entities/schemas/condition";
import type { TPaginatedObservationResponse } from "@/modules/entities/schemas/observation";
import type { TPaginatedMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TPaginatedServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TPaginatedDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import type { TOrgResponse } from "@/modules/entities/schemas/organization";
import type { TPractitionerQualificationListResponse } from "@/modules/entities/schemas/practitioner";
import type { TPaginatedPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/** Route params for the dynamic segments. */
interface ClinicalWorkspacePageProps {
  params: Promise<{ patientId: string; appointmentId: string; locale: string }>;
}

/**
 * Clinical workspace for one appointment.
 *
 * @param params - Dynamic route params ({ patientId, appointmentId, locale }).
 */
export default async function ClinicalWorkspacePage({
  params,
}: ClinicalWorkspacePageProps) {
  const { patientId, appointmentId } = await params;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const practitionerRecord = await requirePractitionerProfile();

  const numericPatientId = parseInt(patientId, 10);
  const numericAppointmentId = parseInt(appointmentId, 10);

  if (isNaN(numericPatientId) || isNaN(numericAppointmentId)) {
    return <WorkspaceError message="Invalid record reference." />;
  }

  /* Appointment, staging row, intake, encounters, and the letterhead extras
     (clinic details, the doctor's own qualifications/specialty, and this
     patient's demographics) are all independent — fetch together. */
  const [
    [appointment],
    [consultation],
    [intake],
    [encountersPage],
    [org],
    [qualificationsPage],
    [rolesPage],
    [patientRecord],
  ] = await Promise.all([
    getAppointmentByIdAction({ payload: { id: numericAppointmentId } }),
    getConsultationByFhirAppointmentIdAction({
      payload: { fhir_appointment_id: numericAppointmentId },
    }),
    getIntakeByFhirAppointmentIdAction({
      payload: { fhir_appointment_id: numericAppointmentId },
    }),
    listEncountersAction({
      payload: { appointment_id: numericAppointmentId, limit: 50 },
    }),
    getMyOrganizationAction(),
    listPractitionerQualificationsAction({
      payload: { practitionerId: practitionerRecord.id },
    }),
    listPractitionerRolesAction({
      payload: { practitioner_id: practitionerRecord.id },
    }),
    getPatientByIdAction({ payload: { id: numericPatientId } }),
  ]);

  if (!appointment) {
    return <WorkspaceError message="Appointment not found." />;
  }

  /* Letterhead extras for the Prescription/Lab-Request sheets. */
  const docMeta = {
    organization: buildOrgLetterhead(org as TOrgResponse | null),
    practitioner: buildPractitionerLetterhead(
      (qualificationsPage as TPractitionerQualificationListResponse | null)
        ?.data ?? [],
      (rolesPage as TPaginatedPractitionerRoleResponse | null)?.data ?? [],
    ),
    patientInfo: buildPatientLetterhead(patientRecord as TPatientResponse | null),
  };

  const encounters =
    (encountersPage as TPaginatedEncounterResponse | null)?.data ?? [];

  /* Resources are linked to a single encounter; the first is the visit's own. */
  const encounterId = encounters[0]?.id ?? null;

  /* Display info from the appointment participants. */
  const patientName = getParticipantName(appointment, "Patient");
  const doctorName = getParticipantName(appointment, "Practitioner");

  /* Live transcript captured during the consultation, if there was one. */
  const transcript = consultation?.virtual_conversation ?? [];

  /*
   * No encounter means the consultation never completed, so there is nothing to
   * document against — every clinical resource links to an encounter. Show the
   * read-only visit view instead of the workspace, rather than sending the
   * doctor out to the old appointment detail page.
   */
  if (encounterId == null) {
    return (
      <div className="w-full space-y-4">
        <BackButton />
        <VisitOverview
          appointment={appointment}
          patientName={patientName}
          doctorName={doctorName}
          intake={intake ?? null}
          transcript={transcript}
        />
      </div>
    );
  }

  /* Published records + attachments for the encounter. */
  const [
    [conditionsPage],
    [observationsPage],
    [medicationsPage],
    [serviceRequestsPage],
    [diagnosticReportsPage],
    [documentsPage],
  ] = await Promise.all([
    listConditionsAction({ payload: { encounter_id: encounterId, limit: 200 } }),
    listObservationsAction({ payload: { encounter_id: encounterId, limit: 200 } }),
    listMedicationRequestsAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
    listServiceRequestsAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
    listDiagnosticReportsAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
    listDocumentReferencesAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
  ]);

  const appointmentDate = appointment.start
    ? new Date(appointment.start).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="w-full space-y-4">
      <BackButton />

      <ClinicalWorkspace
        appointmentId={numericAppointmentId}
        patientId={numericPatientId}
        appointment={appointment}
        encounters={encounters}
        encounterId={encounterId}
        patientName={patientName}
        doctorName={doctorName}
        appointmentDate={appointmentDate}
        docMeta={docMeta}
        savedConditions={
          (conditionsPage as TPaginatedConditionResponse | null)?.data ?? []
        }
        savedObservations={
          (observationsPage as TPaginatedObservationResponse | null)?.data ?? []
        }
        savedMedications={
          (medicationsPage as TPaginatedMedicationRequestResponse | null)?.data ?? []
        }
        savedServiceRequests={
          (serviceRequestsPage as TPaginatedServiceRequestResponse | null)?.data ?? []
        }
        diagnosticReports={
          (diagnosticReportsPage as TPaginatedDiagnosticReportResponse | null)
            ?.data ?? []
        }
        documents={
          (documentsPage as TPaginatedDocumentReferenceResponse | null)?.data ?? []
        }
        staged={{
          conditions: consultation?.conditions ?? null,
          observations: consultation?.observations ?? null,
          medicationRequests: consultation?.medication_requests ?? null,
          serviceRequests: consultation?.service_requests ?? null,
          soapNote: consultation?.soap_note ?? null,
        }}
        aiSoapNote={consultation?.full_report?.soap_report ?? null}
        /* Null means the note and entries are still AI suggestions awaiting
           review. Consultations written before this column existed have no
           stamp, so the workspace falls back to checking FHIR for them. */
        publishedAt={consultation?.published_at ?? null}
        consultationCreatedAt={consultation?.created_at ?? null}
        intake={intake ?? null}
        transcript={transcript}
        orgId={session.session.activeOrganizationId ?? undefined}
        userId={session.user.id}
      />

      {/* Upload modal singletons — controlled by the doctor Zustand store */}
      <DoctorModalProvider />
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

/**
 * Minimal error card with a back button.
 *
 * @param message - Human-readable reason for the failure.
 */
function WorkspaceError({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto mt-16 space-y-4">
      <BackButton />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}
