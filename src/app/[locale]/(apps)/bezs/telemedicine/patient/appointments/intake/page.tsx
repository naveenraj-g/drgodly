/**
 * Voice intake page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/intake/voice
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists.
 *
 * Renders VoiceIntake directly (no extra wrapper) so the component's own
 * full-height layout fills the viewport.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { buildPatientContextPrefix } from "@/modules/shared/helper";
import { VoiceIntakeTest } from "@/modules/client/telemedicine/patient/component/intake/VoiceIntakeTest";

/**
 * Voice-based intake session page (custom WebSocket voice agent).
 */
export default async function VoiceIntakePage() {
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
  // so the voice agent gets the patient's name/age/contact on connection
  // instead of asking for it again every call.
  const patientContext = buildPatientContextPrefix(patient, userName);

  return (
    <VoiceIntakeTest
      patientFhirId={patient.id}
      basePath={basePath}
      userName={userName}
      patientContext={patientContext}
    />
  );
}
