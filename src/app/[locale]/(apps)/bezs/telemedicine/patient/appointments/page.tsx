/**
 * Patient appointments list page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/appointments
 *
 * Server component. Fetches the first page of the authenticated patient's
 * appointments at render time to seed the client table without a loading flash.
 * Subsequent pagination changes are handled client-side via server actions.
 *
 * Guards:
 *  1. Redirects to /login if no session is found.
 *
 * Data flow:
 *  SSR → getMyAppointmentsAction (page 0) → PatientAppointmentsTable (initialData prop)
 *  Client → useQuery → fetchMyAppointments → re-renders on page change
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { PatientAppointmentsTable } from "@/modules/client/telemedicine/patient/component/appointments/list/PatientAppointmentsTable";

/** Page-level page size — must match INITIAL_PAGE_SIZE in the table component. */
const INITIAL_PAGE_SIZE = 10;

/**
 * Patient appointments list page.
 *
 * Pre-fetches the first page of the patient's appointments so the table
 * renders with data on first paint. Falls back to an empty dataset if the
 * server action fails (e.g. FHIR service is down).
 */
export default async function PatientAppointmentsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Pre-fetch page 0 — userId is injected from the session inside the action.
  const [data] = await getMyAppointmentsAction({
    payload: {
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
    },
  });

  /** Safe empty fallback if the action fails at render time. */
  const initialData = data ?? {
    total: 0,
    limit: INITIAL_PAGE_SIZE,
    offset: 0,
    data: [],
  };

  /** Localised href for the "Book Appointment" button in the table toolbar. */
  const bookHref = `/${locale}/bezs/telemedicine/patient/appointments/book`;

  return (
    <div className="space-y-6 w-full">
      {/* ── Page header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">My Appointments</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your upcoming and past appointments.
        </p>
      </div>

      {/* ── Appointments table ── */}
      <PatientAppointmentsTable
        initialData={initialData}
        bookHref={bookHref}
      />
    </div>
  );
}
