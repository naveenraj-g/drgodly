/**
 * Doctor appointments list page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/appointments
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the doctor profile setup page if no FHIR Practitioner record
 *     exists (via requirePractitionerProfile).
 *
 * Data flow:
 *  SSR-fetches the "Today" tab's first page (10 rows) via fetchDemoTabPage,
 *  then hands it to AppointmentDemo as a TanStack Query seed for that one
 *  tab's AppointmentDemoTabPanel. Every other tab (Upcoming/Past/Cancelled),
 *  and every filter/sort/page change within any tab, fetches client-side via
 *  demoQueries.ts — nothing is filtered, sorted, or paginated in the browser.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { AppointmentDemo } from "@/modules/client/telemedicine/doctor/component/appointment-demo/AppointmentDemo";
import { fetchDemoTabPage } from "@/modules/client/telemedicine/doctor/component/appointment-demo/demoQueries";
import { DoctorModalProvider } from "@/modules/client/telemedicine/doctor/provider/DoctorModalProvider";

/** Must match AppointmentDemoTabPanel's INITIAL_PAGE_SIZE so the SSR seed's
 *  query key matches the client's default query exactly. */
const INITIAL_PAGE_SIZE = 10;

/**
 * Doctor appointments list page.
 *
 * Scopes the list to the specific practitioner via practitioner_id, so the
 * doctor only sees their own appointments (not the whole org).
 */
export default async function DoctorAppointmentsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
  const practitioner = await requirePractitionerProfile();

  const orgId = session.session.activeOrganizationId ?? null;
  const base = `/${locale}/bezs/telemedicine/doctor`;

  const initialToday = await fetchDemoTabPage({
    tab: "today",
    practitionerId: practitioner.id,
    orgId,
    pageIndex: 0,
    pageSize: INITIAL_PAGE_SIZE,
    sort: "date",
  });

  return (
    <>
      <AppointmentDemo
        initialToday={initialToday}
        practitionerId={practitioner.id}
        orgId={orgId}
        viewHref={`${base}/appointments`}
        clinicalRecordsHref={`${base}/clinical-records`}
      />
      {/* Modal singletons — controlled by doctor Zustand store (Confirm/Cancel/Reschedule) */}
      <DoctorModalProvider />
    </>
  );
}
