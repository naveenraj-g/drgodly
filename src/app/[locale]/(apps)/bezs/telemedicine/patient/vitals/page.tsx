/**
 * Patient vitals page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/vitals
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /patient/profile if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Detailed, filterable view of the patient's own vitals — a table and a set
 * of trend charts driven by one shared date-range filter (today / this week /
 * this month / custom), so both stay in sync. Reads through the same
 * FHIR-GQL-backed vitals client the doctor dashboard's VitalsInsights card
 * already uses (listVitalsAction) — no new backend, just the first
 * patient-facing surface for this data.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { PatientVitalsPage } from "@/modules/client/telemedicine/patient/component/vitals/PatientVitalsPage";

/**
 * Patient vitals page — renders the client-side filterable vitals view.
 */
export default async function VitalsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  const patient = await requirePatientProfile();

  return (
    <PatientVitalsPage
      patientId={patient.id}
      userId={session.user.id}
      orgId={session.session.activeOrganizationId}
    />
  );
}
