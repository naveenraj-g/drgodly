/**
 * Doctor online-consultation design demo page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/oc-demo
 *
 * A visual-redesign prototype of the online-consultation screen — kept on
 * its own route, separate from the real consultation page
 * (doctor/appointments/online-consultation), so it can be reviewed as a
 * design reference without depending on a real appointment/patient/
 * consultation record existing. Every panel is static mock data (see
 * mockOcData.ts) except the video tile, which is a genuine LiveKit room
 * joined via the same /api/livekit-token + /api/runtime-config endpoints the
 * real consultation pages use (see VideoConsultPanel.tsx) — no FHIR data is
 * required for the call itself to work.
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { OcDemo } from "@/modules/client/telemedicine/doctor/component/oc-demo/OcDemo";

export default async function OcDemoPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <OcDemo />;
}
