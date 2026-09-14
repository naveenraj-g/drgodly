/**
 * /docs/mobile-guide/doctor-journey — ordered call sequence for the doctor app.
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

export default function DoctorJourneyPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Doctor journey</h1>
        <p className="text-sm text-muted-foreground">
          The order a doctor-facing mobile app actually calls things in. Every step links to the page with
          the full request/response spec.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">1. Onboarding</h2>
        <StepList
          steps={[
            { title: "Sign in, get a JWT", detail: <>See <Link className="underline underline-offset-2" href="/docs/mobile-guide/auth">Authentication</Link>.</> },
            { title: "Complete the Practitioner profile", detail: <>POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/practitioner">/practitioners/full</Link> once.</> },
            {
              title: "Scheduling setup (admin-side, one-time per doctor)",
              detail: <>Create a <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/practitioner-role">PractitionerRole</Link> linking the practitioner to an org/location/specialty, a <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/schedule">Schedule</Link>, then bulk-generate <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/slot">Slots</Link> via POST /slots/generate. Not part of daily use — typically a one-time setup screen.</>,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">2. Dashboard</h2>
        <StepList
          steps={[{ title: "Today's appointments", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/appointment">/appointments</Link>?user_id=&lt;self&gt;&amp;start_from=&amp;start_to= for the day&apos;s schedule.</> }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">3. Running a consultation</h2>
        <StepList
          steps={[
            { title: "Open the encounter", detail: <>GET/POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/encounter">/encounters</Link>?appointment_id= — create one if it doesn&apos;t exist yet.</> },
            { title: "Join the video call", detail: <>Same LiveKit sequence as the patient — see <Link className="underline underline-offset-2" href="/docs/mobile-guide/voice-consultation">Voice &amp; video consultation</Link>.</> },
            { title: "Live follow-up suggestions (optional)", detail: <>Poll the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/suggestion">Suggestion Agent</Link> every couple of patient turns with the transcript so far.</> },
            { title: "Ad hoc patient lookups (optional)", detail: <>The <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/doctor-assistant">Doctor Assistant Agent</Link> can answer questions about the patient&apos;s history mid-consultation.</> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">4. Ending the call</h2>
        <StepList
          steps={[
            { title: "Generate the merged report", detail: <>Send the transcript to the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/full-report">Full Report Agent</Link> to get a SOAP note + assessment plan.</> },
            { title: "Save it", detail: <>POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/mobile-api">/api/consultation/complete</Link> with fhir_appointment_id, the transcript, and the generated soap_note/full_report. Flips the Consultation to COMPLETED.</> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">5. Post-consultation review &amp; publish</h2>
        <StepList
          steps={[
            { title: "Extract structured suggestions", detail: <>Send the (possibly doctor-edited) SOAP note to the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/clinical-extraction">Clinical Extraction Agent</Link> for suggested conditions/observations/medications/orders.</> },
            { title: "Doctor reviews and edits", detail: "Let the doctor accept, edit, or discard each suggested item in the UI before anything is written anywhere." },
            {
              title: "Stage the accepted draft",
              detail: <>POST /api/consultation/save-clinical-data with the accepted conditions/observations/medication_requests/service_requests and the final soap_note — this stages the draft on the Consultation record, it does not yet write real FHIR resources.</>,
            },
            {
              title: "Publish to the real EMR",
              detail: <>For each accepted item, call the matching FHIR create endpoint — <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/condition">Condition</Link>, <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/observation">Observation</Link>, <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/medication-request">MedicationRequest</Link>, <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/service-request">ServiceRequest</Link> — then re-call save-clinical-data with mark_published: true to record the approval. This is the one step where &quot;stage&quot; and &quot;real record&quot; are two separate calls, not atomic.</>,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">6. Reviewing an uploaded document</h2>
        <StepList
          steps={[
            { title: "Patient/staff uploads a file", detail: <>See <Link className="underline underline-offset-2" href="/docs/mobile-guide/attachments">File attachments</Link> — the AI extraction agent then writes a staging record automatically, no doctor action needed yet.</> },
            { title: "List pending staging records", detail: <>GET <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir-staging">FHIR staging</Link>?status=completed&amp;patient_id= (status=completed means extraction finished, awaiting doctor review).</> },
            { title: "Ask questions about the document (optional)", detail: <>Chat with either the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/document-chat">Document Chat Agent</Link> or the <Link className="underline underline-offset-2" href="/docs/mobile-guide/agents/pdf-chat">PDF Chat Agent</Link>.</> },
            { title: "Accept or reject", detail: <>PATCH /{"{id}"}/review with review_status on the staging record.</> },
            { title: "Create the real report", detail: <>POST <Link className="underline underline-offset-2" href="/docs/mobile-guide/fhir/diagnostic-report">DiagnosticReport</Link> (and its backing Observations) using the staging data as the source, referencing the ServiceRequest it fulfils via based_on.</> },
          ]}
        />
      </section>
    </div>
  );
}
