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
 * client-side BookAppointment wizard. The optional `?intake_id` query param
 * (set when navigating from the post-intake modal) is read client-side by
 * BookAppointment itself via useSearchParams — not threaded through here —
 * so the value used at booking time always reflects the live URL rather
 * than a copy captured at this page's initial render.
 *
 * All FHIR data fetching (practitioner roles, slots, booking) happens on the
 * client via ZSA server actions — this page only handles auth guards.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { BookAppointment } from "@/modules/client/telemedicine/patient/component/appointments/book/BookAppointment";
import { formatPatientName } from "@/modules/shared/helper";

async function BookAppointmentPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  const patient = await requirePatientProfile();

  return (
    <BookAppointment
      patientFhirId={patient.id}
      patientDisplayName={formatPatientName(patient)}
      userId={session.user.id}
      orgId={session.session.activeOrganizationId ?? ""}
    />
  );
}

export default BookAppointmentPage;
