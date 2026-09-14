/**
 * Doctor practice-overview dashboard page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/dashboard
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Data flow — four independent fetches, run in parallel:
 *   1. listAppointmentsAction({ practitioner_id, limit: 200, sort: "-date" })
 *      — this practitioner's own appointments. Every stat card, the monthly
 *        trend chart, the status donut, and the recent-appointments table
 *        are all derived client-side from this single array.
 *   2. listPractitionerRolesAction({ practitioner_id, limit: 1 })
 *      — the doctor's own PractitionerRole: specialty, active flag, and
 *        weekly availability (days_of_week) for the Practice Profile card.
 *   3. listIntakesAction({ org_id, limit: 200 })
 *   4. listConsultationsAction({ org_id, limit: 200 })
 *      — AI Intake / AI Consultation resources have no practitioner_id
 *        filter (only user_id/org_id/status), so these two are
 *        organisation-wide, aggregated into status counts here and shown
 *        in a panel explicitly labelled as org-wide, never "yours".
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";
import { listIntakesAction } from "@/modules/server/presentation/actions/intake";
import { listConsultationsAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { DashboardOverview } from "@/modules/client/telemedicine/doctor/component/dashboard-overview/DashboardOverview";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import type { TPaginatedPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";
import type { TPaginatedIntakeResponse } from "@/modules/entities/schemas/intake";
import type { TPaginatedConsultationResponse } from "@/modules/entities/schemas/consultation";

/** Max appointments to fetch for dashboard stats — keeps the response bounded. */
const APPOINTMENTS_LIMIT = 200;
/** Max org-wide AI records to fetch per resource for the activity panel. */
const ORG_ACTIVITY_LIMIT = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derives the practitioner's display name from the FHIR Practitioner resource.
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
 * Counts records per status code from a list of `{ status: string }` rows.
 *
 * @param rows - Array of records exposing a `status` field.
 * @returns `{ total, byStatus }`.
 */
function summarizeByStatus<T extends { status: string }>(
  rows: T[],
): { total: number; byStatus: Record<string, number> } {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }
  return { total: rows.length, byStatus };
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Doctor practice-overview page. Fetches the practitioner's appointments,
 * PractitionerRole, and org-wide AI activity in parallel, then renders the
 * client DashboardOverview component.
 */
export default async function DoctorDashboardOverviewPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
  const practitioner = await requirePractitionerProfile();
  const orgId = session.session.activeOrganizationId ?? undefined;

  const [
    [appointmentsPage],
    [rolesPage],
    [intakesPage],
    [consultationsPage],
  ] = await Promise.all([
    listAppointmentsAction({
      payload: {
        practitioner_id: practitioner.id,
        limit: APPOINTMENTS_LIMIT,
        offset: 0,
        sort: "-date",
      },
    }),
    listPractitionerRolesAction({
      payload: { practitioner_id: practitioner.id, limit: 1, offset: 0 },
    }),
    listIntakesAction({
      payload: { org_id: orgId, limit: ORG_ACTIVITY_LIMIT, offset: 0 },
    }),
    listConsultationsAction({
      payload: { org_id: orgId, limit: ORG_ACTIVITY_LIMIT, offset: 0 },
    }),
  ]);

  const appointments: TAppointmentResponse[] =
    (appointmentsPage as TPaginatedAppointmentResponse | null)?.data ?? [];

  const role =
    (rolesPage as TPaginatedPractitionerRoleResponse | null)?.data?.[0] ?? null;
  const specialties =
    role?.specialty
      ?.map((s) => s.coding_display ?? s.text)
      .filter((s): s is string => !!s) ?? [];
  const availableDays = new Set<string>();
  role?.availability?.forEach((block) => {
    block.available_times?.forEach((t) => {
      t.days_of_week?.forEach((d) => availableDays.add(d.toLowerCase().slice(0, 3)));
    });
  });

  const intakes = (intakesPage as TPaginatedIntakeResponse | null)?.data ?? [];
  const consultations =
    (consultationsPage as TPaginatedConsultationResponse | null)?.data ?? [];

  const doctorName = getPractitionerDisplayName(practitioner.name);
  const base = `/${locale}/bezs/telemedicine/doctor`;

  return (
    <DashboardOverview
      doctorName={doctorName}
      appointments={appointments}
      specialties={specialties}
      roleActive={role?.active ?? null}
      availableDays={Array.from(availableDays)}
      intakeActivity={summarizeByStatus(intakes)}
      consultationActivity={summarizeByStatus(consultations)}
      appointmentsHref={`${base}/appointments`}
      profileHref={`${base}/settings/profile`}
    />
  );
}
