/**
 * ConsultationInsights — doctor dashboard card for a completed consultation.
 *
 * Layer: client / telemedicine / doctor / component / dashboard
 *
 * Displays three tabs for a completed virtual consultation:
 *   SOAP Note     — structured subjective / objective / assessment / plan
 *   Assessment    — AI assessment plan (risk level, differential, treatment)
 *   Conversation  — full LiveKit transcript between doctor and patient
 *
 * Mirrors drgodly-mvp ConsultationInsights.tsx in layout and content.
 * Accepts a pre-loaded TConsultationResponse — no internal fetch.
 */

"use client";

import { AlertTriangle, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { TConsultationResponse } from "@/modules/entities/schemas/consultation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationInsightsProps {
  /** Pre-loaded consultation record for the selected appointment. */
  consultation: TConsultationResponse;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Risk level → badge colour classes. */
const RISK_CLASS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

/**
 * Safely extracts a string value from an unknown field.
 *
 * @param v - Unknown value.
 */
function str(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

/**
 * Safely extracts a string array from an unknown field.
 *
 * @param v - Unknown value.
 */
function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((i) => (typeof i === "string" ? i : JSON.stringify(i)));
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

/**
 * SOAP Note tab content.
 *
 * @param soap - SoapNote object from consultation.soap_note.
 */
function SoapTab({ soap }: { soap: TConsultationResponse["soap_note"] }) {
  if (!soap) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No SOAP note recorded for this consultation.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Subjective */}
      {soap.subjective && (
        <Section label="Subjective">
          {soap.subjective.chief_complaint && (
            <Field label="Chief Complaint" value={soap.subjective.chief_complaint} />
          )}
          {soap.subjective.history_of_present_illness && (
            <Field
              label="History of Present Illness"
              value={soap.subjective.history_of_present_illness}
            />
          )}
          {soap.subjective.associated_symptoms &&
            soap.subjective.associated_symptoms.length > 0 && (
              <BulletField
                label="Associated Symptoms"
                items={soap.subjective.associated_symptoms}
              />
            )}
        </Section>
      )}

      {/* Objective */}
      {soap.objective?.observations && soap.objective.observations.length > 0 && (
        <Section label="Objective">
          <BulletField label="Observations" items={soap.objective.observations} />
        </Section>
      )}

      {/* Assessment */}
      {soap.assessment && (
        <Section label="Assessment">
          {soap.assessment.possible_conditions &&
            soap.assessment.possible_conditions.length > 0 && (
              <BulletField
                label="Possible Conditions"
                items={soap.assessment.possible_conditions}
              />
            )}
          {soap.assessment.clinical_reasoning && (
            <Field
              label="Clinical Reasoning"
              value={soap.assessment.clinical_reasoning}
            />
          )}
        </Section>
      )}

      {/* Plan */}
      {soap.plan && (
        <Section label="Plan">
          {soap.plan.next_steps && soap.plan.next_steps.length > 0 && (
            <BulletField label="Next Steps" items={soap.plan.next_steps} />
          )}
          {soap.plan.when_to_seek_care && (
            <Field label="When to Seek Care" value={soap.plan.when_to_seek_care} />
          )}
        </Section>
      )}

      {/* Summary */}
      {soap.summary && (
        <Section label="Summary">
          <p className="leading-relaxed">{soap.summary}</p>
        </Section>
      )}
    </div>
  );
}

/**
 * Assessment & Plan tab content — mirrors IntakeInsights report layout.
 *
 * @param plan - Raw assessment_plan object from full_report.
 */
function AssessmentTab({ plan }: { plan: Record<string, unknown> | undefined }) {
  if (!plan) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No assessment plan available.
      </p>
    );
  }

  const riskLevel = str(plan.risk_level);
  const overview = str(plan.clinical_overview);
  const differential = strArr(plan.differential_diagnosis);
  const diagnosticPlan = str(plan.diagnostic_plan);
  const treatmentPlan = str(plan.treatment_plan);
  const redFlags = strArr(plan.red_flags);

  return (
    <div className="space-y-4 text-sm">
      {riskLevel && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Risk Level
          </span>
          <Badge
            variant="outline"
            className={RISK_CLASS[riskLevel.toLowerCase()] ?? ""}
          >
            {riskLevel}
          </Badge>
        </div>
      )}

      {overview && <Field label="Clinical Overview" value={overview} />}

      {differential.length > 0 && (
        <BulletField label="Differential Diagnosis" items={differential} />
      )}

      {diagnosticPlan && <Field label="Diagnostic Plan" value={diagnosticPlan} />}

      {treatmentPlan && <Field label="Treatment Plan" value={treatmentPlan} />}

      {redFlags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="size-3" />
            Red Flags
          </p>
          <ul className="space-y-1">
            {redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Conversation tab — LiveKit transcript.
 *
 * @param messages - Transcript messages from virtual_conversation.
 */
function ConversationTab({
  messages,
}: {
  messages: TConsultationResponse["virtual_conversation"];
}) {
  if (!messages || messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No transcript recorded.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className="flex items-start gap-2">
          <span
            className={cn(
              "text-[10px] font-semibold shrink-0 mt-0.5 uppercase",
              msg.speaker === "DOCTOR" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {msg.speaker === "DOCTOR" ? "Doctor" : "Patient"}
          </span>
          <p className="text-xs leading-relaxed">{msg.text}</p>
        </div>
      ))}
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
        {label}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="leading-relaxed">{value}</p>
    </div>
  );
}

function BulletField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Tabbed card showing SOAP note, assessment plan, and conversation transcript
 * for a completed consultation.
 *
 * @param consultation - Pre-loaded consultation record.
 */
export function ConsultationInsights({ consultation }: ConsultationInsightsProps) {
  const assessmentPlan = consultation.full_report?.assessment_plan as
    | Record<string, unknown>
    | undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="size-4 text-muted-foreground" />
          Consultation Insights
          <Badge variant="outline" className="text-[10px] ml-auto capitalize">
            {consultation.status.toLowerCase()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="soap">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="soap" className="flex-1 text-xs">
              SOAP Note
            </TabsTrigger>
            <TabsTrigger value="assessment" className="flex-1 text-xs">
              Assessment
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex-1 text-xs">
              Conversation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="soap">
            <ScrollArea className="h-72">
              <SoapTab soap={consultation.soap_note} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="assessment">
            <ScrollArea className="h-72">
              <AssessmentTab plan={assessmentPlan} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="conversation">
            <ScrollArea className="h-72">
              <ConversationTab messages={consultation.virtual_conversation} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
