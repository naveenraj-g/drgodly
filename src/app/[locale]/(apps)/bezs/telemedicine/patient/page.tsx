/**
 * Patient portal dashboard page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session is found.
 *  2. Redirects to /patient/settings/profile if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Data flow:
 *  SSR → getMyAppointmentsAction({ limit: 200 }) → PatientDashboard (derives stats client-side)
 *
 * A limit of 200 ensures the stat cards and charts are accurate across the
 * patient's full history without requiring a separate aggregation endpoint.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { PatientDashboard } from "@/modules/client/telemedicine/patient/component/dashboard/PatientDashboard";
import { formatPatientName } from "@/modules/shared/helper";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/** Max records to fetch for dashboard stats — keeps the response bounded. */
const DASHBOARD_LIMIT = 200;

/**
 * Patient portal home page.
 * Fetches appointments for the authenticated patient and renders the dashboard.
 */
export default async function PatientPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  /* Enforce that the user has completed their patient FHIR profile setup. */
  const patient = await requirePatientProfile();

  /* Fetch the patient's full appointment history for stats (max 200). */
  const [data] = await getMyAppointmentsAction({
    payload: { limit: DASHBOARD_LIMIT, offset: 0 },
  });

  const appointments: TAppointmentResponse[] =
    (data as TPaginatedAppointmentResponse | null)?.data ?? [];

  /* Prefer the FHIR Patient record's given/family name; fall back to the
   * auth account name if the Patient record has no name entries yet. */
  const displayName = formatPatientName(patient);

  return (
    <PatientDashboard userName={displayName} appointments={appointments} />
  );
}
