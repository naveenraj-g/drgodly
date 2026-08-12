/**
 * ConsultationNoteCanvas — the SOAP note as a clinical document.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / note
 *
 * Replaces the review page's SoapEditor (four accordions of labelled inputs)
 * with something a doctor recognises as a note: a letterhead, S/O/A/P headings,
 * and prose. Every block is click-to-edit, so it reads as a document until you
 * touch it.
 *
 * Because it renders as a document rather than a form, it prints correctly with
 * no separate view — `print:` utilities drop the app chrome, matching the
 * approach already used for the prescription sheet.
 *
 * Fully controlled: each commit sends the whole updated SoapNote up so the
 * workspace's staging autosave sees it.
 */

"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditableList } from "../../appointment-review/shared/EditableList";
import type { SoapNote } from "../../appointment-review/types";
import { EditableBlock } from "./EditableBlock";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationNoteCanvasProps {
  /** Current SOAP note — controlled by the workspace. */
  soap: SoapNote;
  /** Called with the full updated note on any commit. */
  onChange: (soap: SoapNote) => void;
  /** Patient name for the letterhead. */
  patientName: string;
  /** Doctor name for the letterhead. */
  doctorName: string;
  /** Formatted visit date for the letterhead. */
  appointmentDate: string | null;
}

// ── Section shell ─────────────────────────────────────────────────────────────

/**
 * One lettered section of the note (S, O, A, P).
 *
 * @param letter - Section initial shown in the margin.
 * @param title - Section name.
 * @param children - Section content.
 */
function NoteSection({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-4">
      {/* Margin initial — gives the note its documentary rhythm */}
      <div
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground print:border-0"
      >
        {letter}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {children}
      </div>
    </section>
  );
}

/**
 * A labelled sub-part within a section.
 *
 * @param label - Field name.
 * @param children - Field content.
 */
function NoteField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Editable SOAP note rendered as a continuous clinical document.
 *
 * @param props - See ConsultationNoteCanvasProps.
 */
export function ConsultationNoteCanvas({
  soap,
  onChange,
  patientName,
  doctorName,
  appointmentDate,
}: ConsultationNoteCanvasProps) {
  /** Applies a patch to one SOAP section and pushes the whole note upward. */
  const setSubjective = (patch: Partial<SoapNote["subjective"]>) =>
    onChange({ ...soap, subjective: { ...soap.subjective, ...patch } });
  const setObjective = (patch: Partial<SoapNote["objective"]>) =>
    onChange({ ...soap, objective: { ...soap.objective, ...patch } });
  const setAssessment = (patch: Partial<SoapNote["assessment"]>) =>
    onChange({ ...soap, assessment: { ...soap.assessment, ...patch } });
  const setPlan = (patch: Partial<SoapNote["plan"]>) =>
    onChange({ ...soap, plan: { ...soap.plan, ...patch } });

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="space-y-6 px-6 py-5 print:px-0">
        {/* ── Letterhead ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">
              Consultation Note
            </h2>
            <p className="text-xs text-muted-foreground">
              {[patientName, appointmentDate, doctorName]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            Print
          </Button>
        </div>

        <Separator />

        {/* ── Subjective ── */}
        <NoteSection letter="S" title="Subjective">
          <NoteField label="Chief complaint">
            <EditableBlock
              value={soap.subjective.chief_complaint}
              onCommit={(v) => setSubjective({ chief_complaint: v })}
              placeholder="what brought the patient in"
              emphasis
            />
          </NoteField>

          <NoteField label="History of present illness">
            <EditableBlock
              value={soap.subjective.history_of_present_illness}
              onCommit={(v) => setSubjective({ history_of_present_illness: v })}
              placeholder="onset, duration, character, aggravating and relieving factors"
              multiline
            />
          </NoteField>

          <NoteField label="Associated symptoms">
            <EditableList
              items={soap.subjective.associated_symptoms}
              onChange={(items) => setSubjective({ associated_symptoms: items })}
              placeholder="e.g. Fever"
              addLabel="Add symptom"
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Objective ── */}
        <NoteSection letter="O" title="Objective">
          <NoteField label="Examination findings">
            <EditableList
              items={soap.objective.observations}
              onChange={(items) => setObjective({ observations: items })}
              placeholder="e.g. Temp 38.4 °C"
              addLabel="Add finding"
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Assessment ── */}
        <NoteSection letter="A" title="Assessment">
          <NoteField label="Possible conditions">
            <EditableList
              items={soap.assessment.possible_conditions}
              onChange={(items) => setAssessment({ possible_conditions: items })}
              placeholder="e.g. Acute streptococcal pharyngitis"
              addLabel="Add condition"
            />
          </NoteField>

          <NoteField label="Clinical reasoning">
            <EditableBlock
              value={soap.assessment.clinical_reasoning}
              onCommit={(v) => setAssessment({ clinical_reasoning: v })}
              placeholder="why this assessment follows from the findings"
              multiline
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Plan ── */}
        <NoteSection letter="P" title="Plan">
          <NoteField label="Next steps">
            <EditableList
              items={soap.plan.next_steps}
              onChange={(items) => setPlan({ next_steps: items })}
              placeholder="e.g. Start amoxicillin 500 mg TID for 7 days"
              addLabel="Add step"
            />
          </NoteField>

          <NoteField label="When to seek care">
            <EditableBlock
              value={soap.plan.when_to_seek_care}
              onCommit={(v) => setPlan({ when_to_seek_care: v })}
              placeholder="red flags that should bring the patient back"
              multiline
            />
          </NoteField>
        </NoteSection>

        <Separator />

        {/* ── Summary ── */}
        <NoteSection letter="∑" title="Summary">
          <EditableBlock
            value={soap.summary}
            onCommit={(v) => onChange({ ...soap, summary: v })}
            placeholder="one-paragraph summary of the visit"
            multiline
          />
        </NoteSection>
      </CardContent>
    </Card>
  );
}
