/**
 * Patient voice AI consultation page — "Coming Soon" placeholder.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/consultation/voice
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Renders the VoiceConsultation placeholder (mirroring drgodly-mvp exactly —
 * voice consultation is not yet implemented).
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { VoiceConsultation } from "@/modules/client/telemedicine/patient/component/consultation/VoiceConsultation";

/**
 * Voice consultation placeholder page.
 */
export default async function ConsultationVoicePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePatientProfile();

  return <VoiceConsultation />;
}
