/**
 * Patient intake page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/intake
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Renders TextIntake directly — the chat intake is the primary intake flow.
 * Voice intake remains available at /intake/voice.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { buildPatientContextPrefix } from "@/modules/shared/helper";
import { TextIntake } from "@/modules/client/telemedicine/patient/component/intake/TextIntake";

/**
 * Patient intake page — renders the text chat intake directly.
 */
export default async function IntakePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  const patient = await requirePatientProfile();

  const basePath = `/${locale}/bezs/telemedicine/patient`;
  const userName = session.user.name ?? "Patient";

  // Precomputed once here (server-side, already have the full Patient record)
  // so the agent gets the patient's name/age/contact on the very first turn
  // instead of asking for it again every session.
  const patientContext = buildPatientContextPrefix(patient, userName);

  return (
    <TextIntake
      patientFhirId={patient.id}
      orgId={session.session.activeOrganizationId}
      basePath={basePath}
      userName={userName}
      patientContext={patientContext}
    />
  );
}
