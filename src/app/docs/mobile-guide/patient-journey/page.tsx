/**
 * /docs/mobile-guide/patient-journey — ordered call sequence for the patient app.
 *
 * Layer: app / docs / mobile-guide
 *
 * Sequencing only — each step links to the page with the full payload spec
 * rather than repeating it, so this page can't drift out of sync with the
 * actual reference content.
 */

import Link from "next/link";

interface Step {
  title: string;
  detail: React.ReactNode;
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{s.title}</p>
            <p className="text-muted-foreground">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function PatientJourneyPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Patient journey</h1>
        <p className="text-sm text-muted-foreground">
          The order a patient-facing mobile app actually calls things in, start to finish. Every step links
          to the page with the full request/response spec.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">1. Onboarding</h2>
        <StepList
          steps={[
            {
              title: "Sign in, get a JWT",
              detail: <>See <Link className="underline underline-offset-2" href="/docs/mobile-guide/auth">Authentication</Link>. Every call below sends this token.</>,
            },
            {
              title: "Complete the Patient profile",
              detail: <>POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/patient">/patients/full</Link> once, before booking is allowed. GET /patients/me on later launches to check whether this is already done.</>,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">2. Pre-appointment intake (optional)</h2>
        <StepList
          steps={[
            {
              title: "Create an intake session",
              detail: <>POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/mobile-api">/api/intake/create</Link> — this is this app&apos;s own Mobile API, not FHIR.</>,
            },
            {
              title: "Have the conversation",
              detail: <>Stream turns directly against the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/intake">Intake Agent</Link> (or the <Link className="underline underline-offset-2" href="/docs/mobile-guide/voice-consultation">voice WebSocket</Link> variant), tracking the session id it returns.</>,
            },
            {
              title: "Generate the clinical report",
              detail: <>On &quot;end chat&quot;, send the full transcript to the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/assessment-plan">Assessment Plan Agent</Link>.</>,
            },
            {
              title: "Save it",
              detail: <>POST /api/intake/update with <code className="rounded bg-muted px-1 py-0.5">{"{ id, conversation, report }"}</code> — flips status to COMPLETED.</>,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">3. Booking a doctor</h2>
        <StepList
          steps={[
            { title: "Search doctors", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/practitioner-role">/practitioner-roles/booking</Link>?specialty_code=&amp;day_of_week= — response is pre-joined with practitioner/location/service detail, no extra lookups needed.</> },
            { title: "Find open times", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/slot">/slots</Link>?practitioner_role_id=&amp;date=&amp;status=free.</> },
            { title: "Book it", detail: <>POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/appointment">/appointments/book</Link> with practitioner_id/slot_id/patient_id. Handle 409 (slot taken) by re-fetching slots.</> },
            {
              title: "Provision the consultation room",
              detail: <>Immediately after a successful booking, POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/mobile-api">/api/consultation/create</Link> with the new fhir_appointment_id — the web app does this right after every booking, not only when the visit starts.</>,
            },
            { title: "Link a prior intake (if step 2 happened)", detail: <>POST /api/intake/link with <code className="rounded bg-muted px-1 py-0.5">{"{ id, fhir_appointment_id }"}</code>.</> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">4. Dashboard / upcoming visits</h2>
        <StepList
          steps={[{ title: "List appointments", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/appointment">/appointments</Link>?user_id=&lt;self&gt; — no separate &quot;my appointments&quot; endpoint, filter by your own user_id.</> }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">5. Joining the visit</h2>
        <StepList
          steps={[{ title: "Video call", detail: <>Full LiveKit sequence on <Link className="underline underline-offset-2" href="/docs/mobile-guide/voice-consultation">Voice &amp; video consultation</Link> — token, room connect, optional live transcript.</> }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">6. After the visit</h2>
        <StepList
          steps={[
            { title: "Encounter", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/encounter">/encounters</Link>?appointment_id= for the clinical record of the visit.</> },
            { title: "Prescriptions", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/medication-request">/medication-requests</Link>?patient_id=.</> },
            { title: "Orders &amp; results", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/service-request">/service-requests</Link> and <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/diagnostic-report">/diagnostic-reports</Link>?patient_id=.</> },
            { title: "Conditions &amp; vitals", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/condition">/conditions</Link> and <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/observation">/observations</Link>?patient_id=.</> },
            { title: "View attached files", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/attachments">/api/filenest-download-url</Link>?fileId= for any result document.</> },
          ]}
        />
      </section>
    </div>
  );
}
