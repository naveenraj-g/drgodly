/**
 * Doctor portal dashboard page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
 *     (via requirePractitionerProfile).
 *
 * Data flow:
 *  SSR → listAppointmentsAction(practitioner_id, today's date range)
 *      → DoctorDashboard (two-panel: appointment list + lazy-loaded detail cards)
 *
 * Today's appointments are scoped and ordered entirely server-side:
 * start_from/start_to restrict to the day, status=pending,booked (OR'd on the
 * backend) hides fulfilled/cancelled/etc., and sort=date returns them already
 * chronological — no client-side filtering or sorting happens on this list.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import {
  DASHBOARD_APPOINTMENTS_LIMIT,
  DASHBOARD_APPOINTMENT_SORT,
  DASHBOARD_APPOINTMENT_STATUS,
  DoctorDashboard,
} from "@/modules/client/telemedicine/doctor/component/dashboard/DoctorDashboard";
import { DoctorModalProvider } from "@/modules/client/telemedicine/doctor/provider/DoctorModalProvider";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Derives the practitioner's display name from the FHIR Practitioner resource.
 * Prefers the text field of the first name entry, then constructs from given + family.
 *
 * @param name - Array of HumanName objects from TPractitionerResponse.name.
 * @returns Display name string, or "Doctor" as fallback.
 */
function getPractitionerDisplayName(
  name?: Array<{
    text?: string | null;
    family?: string | null;
    given?: string[] | null;
  }> | null,
): string {
  if (!name || name.length === 0) return "Doctor";
  const first = name[0];
  if (first.text) return first.text;
  const parts = [...(first.given ?? []), first.family ?? ""].filter(Boolean);
  return parts.join(" ") || "Doctor";
}

/**
 * Doctor dashboard page.
 * Fetches today's appointments for the authenticated practitioner and renders
 * the two-panel DoctorDashboard.
 */
export default async function DoctorPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  console.log({
    orgId: session.session.activeOrganizationId,
    userId: session.user.id,
  });

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record
  const practitioner = await requirePractitionerProfile();

  // Build today's date range in ISO 8601 (local midnight → 23:59:59.999)
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [data] = await listAppointmentsAction({
    payload: {
      practitioner_id: practitioner.id,
      start_from: startOfDay.toISOString(),
      start_to: endOfDay.toISOString(),
      status: DASHBOARD_APPOINTMENT_STATUS,
      sort: DASHBOARD_APPOINTMENT_SORT,
      limit: DASHBOARD_APPOINTMENTS_LIMIT,
      offset: 0,
    },
  });

  const appointments: TAppointmentResponse[] =
    (data as TPaginatedAppointmentResponse | null)?.data ?? [];

  const doctorName = getPractitionerDisplayName(practitioner.name);

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const base = `/${locale}/bezs/telemedicine/doctor`;

  return (
    <>
      <DoctorDashboard
        appointments={appointments}
        doctorName={doctorName}
        todayLabel={todayLabel}
        practitionerId={practitioner.id}
        viewHref={`${base}/appointments`}
        clinicalRecordsHref={`${base}/clinical-records`}
      />

      {/* Modal singletons — controlled by doctor Zustand store. Needed here
          too since Confirm/Reschedule/Cancel are now also actionable from
          the dashboard's selected-appointment action bar, not just the
          full appointments table. */}
      <DoctorModalProvider />
    </>
  );
}
