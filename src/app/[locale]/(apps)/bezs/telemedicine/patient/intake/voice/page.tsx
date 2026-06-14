/**
 * Voice intake page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/intake/voice
 *
 * Server component. Guards session and patient record, then renders the
 * VoiceIntake client component.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getPatientMeAction } from "@/modules/server/presentation/actions/patient";
import { VoiceIntake } from "@/modules/client/telemedicine/patient/component/intake/VoiceIntake";

/** Silently returns null if the patient record doesn't exist yet. */
async function fetchPatientOrNull() {
  const [data, err] = await getPatientMeAction();
  if (err?.code === "NOT_FOUND") return null;
  return data ?? null;
}

/**
 * Voice-based intake session page (Vapi AI).
 */
export default async function VoiceIntakePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const patient = await fetchPatientOrNull();
  if (!patient) {
    redirect({ href: "/bezs/telemedicine/patient/profile", locale });
    return null;
  }

  const basePath = `/${locale}/bezs/telemedicine/patient`;

  return (
    <div className="space-y-4 w-full max-w-lg mx-auto">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Voice Intake</h1>
        <p className="text-sm text-muted-foreground">
          Speak naturally with the AI intake assistant.
        </p>
      </div>
      <VoiceIntake patientFhirId={patient.id} basePath={basePath} />
    </div>
  );
}
