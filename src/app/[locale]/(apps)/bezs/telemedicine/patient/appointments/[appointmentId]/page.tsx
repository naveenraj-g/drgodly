/**
 * Patient appointment detail page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/appointments/[appointmentId]
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /patient/profile if no FHIR Patient record exists.
 *
 * Data flow:
 *  1. Fetches the full appointment record by numeric ID.
 *  2. Fetches the linked intake record (if any) by fhir_appointment_id.
 *  3. Renders AppointmentDetailHeader + IntakeReportSection.
 *
 * The page is intentionally server-rendered so the report is available on
 * first paint without a loading spinner.
 */

import Link from "next/link";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import { getIntakeByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/intake";
import { AppointmentDetailHeader } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentDetailHeader";
import { IntakeReportSection } from "@/modules/client/telemedicine/shared/components/appointment/IntakeReportSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Route params for the dynamic segment. */
interface PatientAppointmentViewPageProps {
  params: Promise<{ appointmentId: string; locale: string }>;
}

/**
 * Patient-facing appointment detail page.
 *
 * Shows appointment metadata from the patient's perspective (doctor name,
 * date/time, status) and the AI pre-intake report if one was linked to this
 * appointment.
 */
export default async function PatientAppointmentViewPage({
  params,
}: PatientAppointmentViewPageProps) {
  const { appointmentId } = await params;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  await requirePatientProfile();

  const backHref = `/${locale}/bezs/telemedicine/patient/appointments`;
  const numericId = parseInt(appointmentId, 10);

  if (isNaN(numericId)) {
    return <AppointmentNotFound backHref={backHref} />;
  }

  // Fetch the appointment and linked intake in parallel
  const [[appointment], [intake]] = await Promise.all([
    getAppointmentByIdAction({ payload: { id: numericId } }),
    getIntakeByFhirAppointmentIdAction({
      payload: { fhir_appointment_id: numericId },
    }),
  ]);

  if (!appointment) {
    return <AppointmentNotFound backHref={backHref} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Appointment header — date, status, doctor, type */}
      <AppointmentDetailHeader
        appointment={appointment}
        backHref={backHref}
        perspective="patient"
      />

      {/* AI intake report — component handles its own empty state */}
      <IntakeReportSection intake={intake} />
    </div>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────

/**
 * Renders a back button and empty-state card when the appointment is not found.
 *
 * @param backHref - URL to navigate back to the appointments list.
 */
function AppointmentNotFound({ backHref }: { backHref: string }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Back to Appointments
        </Link>
      </Button>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Appointment not found.
        </CardContent>
      </Card>
    </div>
  );
}
