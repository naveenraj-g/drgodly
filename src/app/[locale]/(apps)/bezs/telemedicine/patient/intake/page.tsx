/**
 * Patient intake chooser page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/intake
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists.
 *
 * Renders two cards — "Text Intake" and "Voice Intake" — that navigate to
 * the respective intake sub-pages.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { MessageSquare, Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getPatientMeAction } from "@/modules/server/presentation/actions/patient";

/** Silently returns null if the patient record doesn't exist yet. */
async function fetchPatientOrNull() {
  const [data, err] = await getPatientMeAction();
  if (err?.code === "NOT_FOUND") return null;
  return data ?? null;
}

/**
 * Intake mode chooser page.
 * Displays "Text" and "Voice" intake cards and redirects to the appropriate
 * sub-page when selected.
 */
export default async function IntakePage() {
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

  const base = `/${locale}/bezs/telemedicine/patient/intake`;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Pre-Appointment Intake</h1>
        <p className="text-sm text-muted-foreground">
          Complete a quick intake so your doctor has context before the
          appointment. Choose your preferred format.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Text intake card */}
        <Link href={`${base}/text`}>
          <Card className="h-full cursor-pointer border-2 transition-colors hover:border-primary hover:bg-primary/5">
            <CardHeader className="items-center text-center pb-3">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <MessageSquare className="size-6" />
              </div>
              <CardTitle className="text-base">Text Chat</CardTitle>
              <CardDescription className="text-xs">
                Type your symptoms and history in a guided chat session.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs text-muted-foreground">
                Quiet environment · Detailed responses · AI generates clinical summary
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Voice intake card */}
        <Link href={`${base}/voice`}>
          <Card className="h-full cursor-pointer border-2 transition-colors hover:border-primary hover:bg-primary/5">
            <CardHeader className="items-center text-center pb-3">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Mic className="size-6" />
              </div>
              <CardTitle className="text-base">Voice</CardTitle>
              <CardDescription className="text-xs">
                Speak naturally with an AI assistant over a voice call.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs text-muted-foreground">
                Hands-free · Natural conversation · Microphone required
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
