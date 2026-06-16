/**
 * Doctor EMR page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/emr
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record
 *     (via requirePractitionerProfile).
 *
 * Renders EMRChatPanel in "doctor" mode — a two-tab AI workspace:
 *   • "AI Chat"    — conversational FHIR tool-calling session
 *   • "UI Browser" — browsable A2UI schema catalogue
 *
 * No SSR data fetching needed; both tabs load their own data client-side.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { EMRChatPanel } from "@/modules/client/telemedicine/doctor/component/emr/EMRChatPanel";

/**
 * DoctorEMRPage — server entry point for the doctor EMR workspace.
 *
 * Auth-guards the route, then delegates all rendering to the client-side
 * EMRChatPanel component.
 */
export default async function DoctorEMRPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Ensures the doctor has a FHIR Practitioner record; redirects if missing.
  await requirePractitionerProfile();

  return <EMRChatPanel role="doctor" />;
}
