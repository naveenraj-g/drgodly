/**
 * Appointment booking page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/appointments/book
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Calls getPatientMeAction() to verify the user has a FHIR Patient record.
 *     Redirects to the patient profile page if the record does not exist yet.
 *  3. Passes the patient's FHIR integer ID and the session userId/orgId to
 *     the client-side BookAppointment wizard.
 *
 * All FHIR data fetching (practitioner roles, slots, booking) happens on the
 * client via ZSA server actions — this page only handles auth guards.
 */

import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getPatientMeAction } from "@/modules/server/presentation/actions/patient";
import { getLocale } from "next-intl/server";
import { BookAppointment } from "@/modules/client/telemedicine/patient/component/appointments/book/BookAppointment";

/**
 * Fetches the authenticated user's FHIR Patient record.
 * Returns null if the record has not been created yet (NOT_FOUND).
 *
 * @returns Patient record or null.
 */
async function fetchPatientOrNull() {
  const [data, err] = await getPatientMeAction();
  if (err) {
    if (err.code === "NOT_FOUND") return null;
    throw new Error(err.message ?? "Failed to load patient profile");
  }
  return data ?? null;
}

async function BookAppointmentPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const patient = await fetchPatientOrNull();

  // Patient must complete their profile before booking
  if (!patient) {
    redirect({
      href: "/bezs/telemedicine/patient/profile",
      locale,
    });
    return null;
  }

  return (
    <BookAppointment
      patientFhirId={patient.id}
      userId={session.user.id}
      orgId={session.session.activeOrganizationId ?? ""}
    />
  );
}

export default BookAppointmentPage;
