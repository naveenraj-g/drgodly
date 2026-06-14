/**
 * Appointment booking page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/appointments/book
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Passes the patient's FHIR integer ID and session userId/orgId to the
 * client-side BookAppointment wizard. Reads optional `?intake_id` query param
 * set when navigating from the post-intake modal.
 *
 * All FHIR data fetching (practitioner roles, slots, booking) happens on the
 * client via ZSA server actions — this page only handles auth guards.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { BookAppointment } from "@/modules/client/telemedicine/patient/component/appointments/book/BookAppointment";

async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  const patient = await requirePatientProfile();

  // Read intake_id query param — set when navigating from the post-intake modal
  const params = await searchParams;
  const rawIntakeId = params["intake_id"];
  const intakeId = rawIntakeId ? Number(rawIntakeId) : undefined;

  return (
    <BookAppointment
      patientFhirId={patient.id}
      userId={session.user.id}
      orgId={session.session.activeOrganizationId ?? ""}
      intakeId={Number.isFinite(intakeId) ? intakeId : undefined}
    />
  );
}

export default BookAppointmentPage;
