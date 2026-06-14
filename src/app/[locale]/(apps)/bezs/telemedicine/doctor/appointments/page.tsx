/**
 * Doctor appointments list page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/appointments
 *
 * Server component. Fetches the first page of appointments for the active
 * organisation at render time to seed the client table without a loading flash.
 * Subsequent pagination changes are handled client-side via server actions.
 *
 * Guards:
 *  1. Redirects to /login if no session is found.
 *
 * Data flow:
 *  SSR → listAppointmentsAction(org_id, page 0) → DoctorAppointmentsTable (initialData prop)
 *  Client → useQuery → fetchDoctorAppointments → re-renders on page change
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { DoctorAppointmentsTable } from "@/modules/client/telemedicine/doctor/component/appointments/list/DoctorAppointmentsTable";

/** Page-level page size — must match INITIAL_PAGE_SIZE in the table component. */
const INITIAL_PAGE_SIZE = 10;

/**
 * Doctor appointments list page.
 *
 * Pre-fetches the first page of org-scoped appointments so the table
 * renders with data on first paint. Falls back to an empty dataset if the
 * server action fails.
 */
export default async function DoctorAppointmentsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const orgId = session.session.activeOrganizationId ?? null;

  // Pre-fetch page 0 scoped to the active organisation.
  const [data] = await listAppointmentsAction({
    payload: {
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
      org_id: orgId ?? undefined,
    },
  });

  /** Safe empty fallback if the action fails at render time. */
  const initialData = data ?? {
    total: 0,
    limit: INITIAL_PAGE_SIZE,
    offset: 0,
    data: [],
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── Page header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Manage patient appointments for your practice.
        </p>
      </div>

      {/* ── Appointments table ── */}
      <DoctorAppointmentsTable
        initialData={initialData}
        orgId={orgId}
      />
    </div>
  );
}
