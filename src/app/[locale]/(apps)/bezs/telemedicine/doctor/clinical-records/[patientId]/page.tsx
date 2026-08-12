/**
 * Clinical Records — patient appointments page (step 2 of 3).
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/clinical-records/[patientId]
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Data flow:
 *  SSR → in parallel: getPatientByIdAction, fetchAllDoctorAppointments(patient_id),
 *        listEncountersAction(patient_id)
 *      → PatientHeaderCard + PatientAppointmentList
 *
 * Encounters are fetched once for the whole patient and matched back to
 * appointments via Encounter.appointment[] — one request instead of one per
 * appointment row.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getPatientByIdAction } from "@/modules/server/presentation/actions/patient";
import { listEncountersAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import {
  fetchAllDoctorAppointments,
  getParticipantName,
  splitAppointmentsByTime,
} from "@/modules/server/presentation/helpers/doctorPatients";
import { PatientHeaderCard } from "@/modules/client/telemedicine/doctor/component/clinical-records/PatientHeaderCard";
import { PatientAppointmentList } from "@/modules/client/telemedicine/doctor/component/clinical-records/PatientAppointmentList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";
import type { TPaginatedEncounterResponse } from "@/modules/entities/schemas/encounter";

/** Route params for the dynamic segment. */
interface PatientClinicalRecordsPageProps {
  params: Promise<{ patientId: string; locale: string }>;
}

/**
 * Lists the selected patient's appointments with this doctor.
 *
 * @param params - Dynamic route params ({ patientId, locale }).
 */
export default async function PatientClinicalRecordsPage({
  params,
}: PatientClinicalRecordsPageProps) {
  const { patientId } = await params;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const practitioner = await requirePractitionerProfile();

  const orgId = session.session.activeOrganizationId ?? null;
  const base = `/${locale}/bezs/telemedicine/doctor`;
  const backHref = `${base}/clinical-records`;
  const numericPatientId = parseInt(patientId, 10);

  if (isNaN(numericPatientId)) {
    return <RecordsError backHref={backHref} message="Invalid patient ID." />;
  }

  /* Patient record, this doctor's appointments with them, and every encounter
     for the patient — all independent, so fetch in parallel. */
  const [[patient], appointments, [encountersPage]] = await Promise.all([
    getPatientByIdAction({ payload: { id: numericPatientId } }),
    fetchAllDoctorAppointments({
      practitionerId: practitioner.id,
      orgId,
      patientId: numericPatientId,
    }),
    listEncountersAction({
      payload: { patient_id: numericPatientId, limit: 200 },
    }),
  ]);

  /*
   * Map encounters back to appointments. An encounter references its appointment
   * through the appointment[] child array, so collect every referenced id and
   * use that set to decide which rows can open the clinical workspace.
   */
  const encounters =
    (encountersPage as TPaginatedEncounterResponse | null)?.data ?? [];
  const appointmentIdsWithEncounter = [
    ...new Set(
      encounters.flatMap((enc) =>
        (enc.appointment ?? [])
          .map((ref) => ref.reference_id)
          .filter((id): id is number => id != null),
      ),
    ),
  ];

  /* The appointment participant is the most reliable name source when the
     Patient record itself has no name[] entries. */
  const fallbackName = appointments[0]
    ? getParticipantName(appointments[0], "Patient")
    : "Patient";

  /* Split here rather than in the component — reading the clock during render
     is disallowed in React components. */
  const { upcoming, past } = splitAppointmentsByTime(appointments);

  return (
    /* Wider than the other Clinical Records pages so the appointment grid has
       room for three columns — it caps at 1152px, giving ~370px per card. */
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* ── Back link ── */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="gap-1.5 -ml-2 text-muted-foreground"
      >
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Back to Patients
        </Link>
      </Button>

      {/* ── Patient identity ── */}
      <PatientHeaderCard
        patient={(patient as TPatientResponse | null) ?? null}
        fallbackName={fallbackName}
        patientId={numericPatientId}
      />

      {/* ── Appointment history ── */}
      <PatientAppointmentList
        upcoming={upcoming}
        past={past}
        appointmentIdsWithEncounter={appointmentIdsWithEncounter}
        workspaceBaseHref={`${backHref}/${numericPatientId}`}
      />
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

/**
 * Minimal error card with a back link.
 *
 * @param backHref - Where the back button navigates.
 * @param message - Human-readable reason for the failure.
 */
function RecordsError({
  backHref,
  message,
}: {
  backHref: string;
  message: string;
}) {
  return (
    <div className="max-w-md mx-auto mt-16 space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="gap-1.5 -ml-2 text-muted-foreground"
      >
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Back to Patients
        </Link>
      </Button>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}
