/**
 * Text intake page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/intake/text
 *
 * Server component. Guards session and patient record, then renders the
 * TextIntake client component with the patient's FHIR ID and base path.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getPatientMeAction } from "@/modules/server/presentation/actions/patient";
import { TextIntake } from "@/modules/client/telemedicine/patient/component/intake/TextIntake";

/** Silently returns null if the patient record doesn't exist yet. */
async function fetchPatientOrNull() {
  const [data, err] = await getPatientMeAction();
  if (err?.code === "NOT_FOUND") return null;
  return data ?? null;
}

/**
 * Text-based intake session page.
 */
export default async function TextIntakePage() {
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
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Text Intake</h1>
        <p className="text-sm text-muted-foreground">
          Chat with the AI to share your symptoms and medical history.
        </p>
      </div>
      <TextIntake patientFhirId={patient.id} basePath={basePath} />
    </div>
  );
}
