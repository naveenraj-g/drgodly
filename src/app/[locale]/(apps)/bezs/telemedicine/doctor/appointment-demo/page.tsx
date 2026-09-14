/**
 * Doctor "My Appointments" design demo page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/appointment-demo
 *
 * A visual-redesign prototype of the appointments screen — kept on its own
 * route, separate from the real Appointments page (doctor/appointments), so
 * it can be reviewed as a design reference without touching that functional
 * flow. Every list/count on this page is real and server-paginated: it
 * SSR-fetches the "Today" tab's first page (10 rows) the same way
 * doctor/appointments/page.tsx SSR-fetches its default page, then hands it to
 * AppointmentDemo as a TanStack Query seed for that one tab's
 * AppointmentDemoTabPanel. Every other tab, and every filter/sort/page change
 * within any tab, fetches client-side via the same demoQueries.ts fetchers —
 * nothing is filtered, sorted, or paginated in the browser.
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the doctor profile setup page if no FHIR Practitioner
 *     record exists (via requirePractitionerProfile).
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

export default async function AppointmentDemoPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

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
