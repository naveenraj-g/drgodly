/**
 * /docs/mobile-guide — landing page for the mobile integration guide.
 *
 * Layer: app / docs / mobile-guide
 */

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS: { href: string; title: string; description: string }[] = [
  { href: "/docs/mobile-guide/auth", title: "Authentication", description: "The one bearer-JWT flow every other API in this guide assumes. Read this first." },
  { href: "/docs/mobile-guide/patient-journey", title: "Patient journey", description: "Ordered call sequence: onboarding → intake → booking → visit → results." },
  { href: "/docs/mobile-guide/doctor-journey", title: "Doctor journey", description: "Ordered call sequence: dashboard → consultation → review → publish." },
  { href: "/docs/mobile-guide/mobile-api", title: "Mobile API", description: "This app's own Intake/Consultation/AiConsultation REST API, plus the full OpenAPI reference." },
  { href: "/docs/mobile-guide/fhir", title: "FHIR resources", description: "Patient, Appointment, Condition, Observation, and 13 more — called directly against FHIR_GQL_URL." },
  { href: "/docs/mobile-guide/fhir-staging", title: "FHIR staging", description: "The AI-extraction review workflow that sits in front of the real EMR." },
  { href: "/docs/mobile-guide/agents", title: "AI agents", description: "9 chat/extraction agents, called directly against each agent's own host." },
  { href: "/docs/mobile-guide/voice-consultation", title: "Voice & video consultation", description: "Raw WebSocket voice protocol and LiveKit WebRTC video calls." },
  { href: "/docs/mobile-guide/attachments", title: "File attachments", description: "FileNest upload/download flow for lab results, photos, and documents." },
];

export default function MobileGuideOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Drgodly Mobile Integration Guide</h1>
        <p className="text-sm text-muted-foreground">
          Everything a mobile app needs to replicate this web app&apos;s patient and doctor experiences —
          FHIR clinical data, the FHIR-staging review workflow, the AI agents, and this app&apos;s own Mobile
          API — with the exact request/response shapes this web app already validates in production.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">How the three API families relate</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">FHIR</span> and the{" "}
            <span className="font-medium text-foreground">AI agents</span> are called{" "}
            <span className="font-medium">directly</span> — mobile skips this Next.js app entirely and hits
            FHIR_GQL_URL / each agent&apos;s host with its own bearer JWT. The web app only proxies these
            because a browser only has a session cookie, not a JWT; mobile doesn&apos;t have that problem.
          </li>
          <li>
            The <span className="font-medium text-foreground">Mobile API</span> (Intake/Consultation/
            AiConsultation) <span className="font-medium">is</span> this Next.js app — there&apos;s no other
            host to skip to, this proprietary data lives only here.
          </li>
          <li>
            <span className="font-medium text-foreground">FHIR staging, file attachments, and voice
            tokens</span> are the exceptions — see the callouts on their respective pages for what&apos;s
            different (no auth at all, or still cookie-gated pending new work).
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Start here</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="space-y-1 pt-4">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
