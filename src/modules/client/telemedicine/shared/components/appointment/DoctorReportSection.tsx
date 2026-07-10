/**
 * DoctorReportSection — read-only display of the post-consultation doctor report.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Shows two sections:
 *   1. SOAP Note — read-only view of the AI-generated + doctor-reviewed note.
 *   2. FHIR Clinical Records — confirmed Conditions, Observations, MedicationRequests,
 *      and ServiceRequests that the doctor saved after reviewing the consultation.
 *
 * Used on both the doctor and patient appointment detail pages.
 * If neither the SOAP note nor any FHIR records are present, renders an empty state
 * informing the user that the doctor hasn't completed the review yet.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  ClipboardList,
  ListChecks,
  AlertCircle,
  Activity,
  Pill,
  FlaskConical,
  Eye,
  Clock,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { SoapNote } from "@/modules/client/telemedicine/doctor/component/appointment-review/types";

// ── SOAP Note read-only view ──────────────────────────────────────────────────

/**
 * Renders a string array as a row of secondary badges.
 *
 * @param items - String values to display.
 */
function BadgeList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="secondary" className="text-xs font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Renders a string array as a bullet list.
 *
 * @param items - String values to display as bullets.
 */
function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex gap-2">
          <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Read-only display of a doctor-reviewed SOAP note.
 *
 * @param soap - Structured SOAP note from the consultation full report.
 */
function SoapNoteView({ soap }: { soap: SoapNote }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      {soap.summary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
            Summary
          </p>
          <p className="text-sm leading-relaxed">{soap.summary}</p>
        </div>
      )}

      {/* Subjective */}
      {(soap.subjective.chief_complaint ||
        soap.subjective.history_of_present_illness ||
        soap.subjective.associated_symptoms.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subjective
            </p>
          </div>
          {soap.subjective.chief_complaint && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Chief Complaint
              </p>
              <p className="text-sm">{soap.subjective.chief_complaint}</p>
            </div>
          )}
          {soap.subjective.history_of_present_illness && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                History of Present Illness
              </p>
              <p className="text-sm leading-relaxed">
                {soap.subjective.history_of_present_illness}
              </p>
            </div>
          )}
          {soap.subjective.associated_symptoms.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Associated Symptoms
              </p>
              <BadgeList items={soap.subjective.associated_symptoms} />
            </div>
          )}
        </div>
      )}

      {/* Objective */}
      {soap.objective.observations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Eye className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Objective
            </p>
          </div>
          <BulletList items={soap.objective.observations} />
        </div>
      )}

      {/* Assessment */}
      {(soap.assessment.possible_conditions.length > 0 ||
        soap.assessment.clinical_reasoning) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assessment
            </p>
          </div>
          {soap.assessment.possible_conditions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Possible Conditions
              </p>
              <BadgeList items={soap.assessment.possible_conditions} />
            </div>
          )}
          {soap.assessment.clinical_reasoning && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Clinical Reasoning
              </p>
              <p className="text-sm leading-relaxed">
                {soap.assessment.clinical_reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plan */}
      {(soap.plan.next_steps.length > 0 || soap.plan.when_to_seek_care) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
          </div>
          {soap.plan.next_steps.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Next Steps</p>
              <BulletList items={soap.plan.next_steps} />
            </div>
          )}
          {soap.plan.when_to_seek_care && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                When to Seek Care
              </p>
              <p className="text-sm leading-relaxed">
                {soap.plan.when_to_seek_care}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FHIR resource list views ──────────────────────────────────────────────────

/**
 * Renders the list of confirmed FHIR Conditions.
 *
 * @param conditions - Array of condition records from the FHIR server.
 */
function ConditionList({ conditions }: { conditions: TConditionResponse[] }) {
  if (!conditions.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Activity className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conditions
        </p>
      </div>
      <div className="space-y-1.5">
        {conditions.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 gap-3"
          >
            <p className="text-sm font-medium">
              {c.code_display ?? c.code_text ?? "Unknown condition"}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {c.clinical_status_code && (
                <Badge variant="outline" className="text-xs font-normal capitalize">
                  {c.clinical_status_code}
                </Badge>
              )}
              {c.verification_status_code && (
                <Badge variant="secondary" className="text-xs font-normal capitalize">
                  {c.verification_status_code}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the list of confirmed FHIR Observations.
 *
 * @param observations - Array of observation records from the FHIR server.
 */
function ObservationList({ observations }: { observations: TObservationResponse[] }) {
  if (!observations.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Observations
        </p>
      </div>
      <div className="space-y-1.5">
        {observations.map((o) => {
          const value =
            o.value_quantity_value != null
              ? `${o.value_quantity_value}${o.value_quantity_unit ? ` ${o.value_quantity_unit}` : ""}`
              : (o.value_string ?? null);
          return (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 gap-3"
            >
              <p className="text-sm font-medium">
                {o.code_display ?? o.code_text ?? "Unknown observation"}
              </p>
              {value && (
                <p className="text-sm text-muted-foreground shrink-0">{value}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders the list of confirmed FHIR MedicationRequests.
 *
 * @param medications - Array of medication request records from the FHIR server.
 */
function MedicationList({
  medications,
}: {
  medications: TMedicationRequestResponse[];
}) {
  if (!medications.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Pill className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Medications
        </p>
      </div>
      <div className="space-y-1.5">
        {medications.map((m) => {
          const dosage = m.dosage_instruction?.[0];
          const details = [
            dosage?.text,
            dosage?.route_display ?? dosage?.route_text,
            dosage?.timing_code_display,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={m.id}
              className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5"
            >
              <p className="text-sm font-medium">
                {m.medication_code_display ??
                  m.medication_code_text ??
                  "Unknown medication"}
              </p>
              {details && (
                <p className="text-xs text-muted-foreground">{details}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders the list of confirmed FHIR ServiceRequests (orders/investigations).
 *
 * @param serviceRequests  - Array of service request records from the FHIR server.
 * @param onUploadResult   - Optional callback to open the upload-result modal for a specific request.
 *                           When provided, each card shows an "Upload Result" button.
 */
function ServiceRequestList({
  serviceRequests,
  onUploadResult,
}: {
  serviceRequests: TServiceRequestResponse[];
  onUploadResult?: (sr: TServiceRequestResponse) => void;
}) {
  if (!serviceRequests.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ClipboardList className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Orders / Investigations
        </p>
      </div>
      <div className="space-y-1.5">
        {serviceRequests.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 gap-3"
          >
            <p className="text-sm font-medium">
              {s.code_display ?? s.code_text ?? "Unknown order"}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {s.priority && (
                <Badge variant="outline" className="text-xs font-normal capitalize">
                  {s.priority}
                </Badge>
              )}
              {s.status && (
                <Badge variant="secondary" className="text-xs font-normal capitalize">
                  {s.status}
                </Badge>
              )}
              {onUploadResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => onUploadResult(s)}
                >
                  <Upload className="size-3" />
                  Upload Result
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for DoctorReportSection. */
export interface DoctorReportSectionProps {
  /**
   * SOAP note from the consultation full report (soap_report.soap).
   * Null when the doctor hasn't completed the post-consultation review yet.
   */
  soap: SoapNote | null | undefined;
  /** FHIR Conditions confirmed by the doctor. */
  conditions: TConditionResponse[];
  /** FHIR Observations confirmed by the doctor. */
  observations: TObservationResponse[];
  /** FHIR MedicationRequests confirmed by the doctor. */
  medications: TMedicationRequestResponse[];
  /** FHIR ServiceRequests confirmed by the doctor. */
  serviceRequests: TServiceRequestResponse[];
  /**
   * Optional callback called when the user clicks "Upload Result" on a ServiceRequest card.
   * When provided, each ServiceRequest card renders the Upload Result button.
   * Omit on the doctor view — only pass on the patient appointment detail page.
   */
  onUploadResult?: (sr: TServiceRequestResponse) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Read-only display of the doctor's post-consultation report.
 * Shows the SOAP note and confirmed FHIR clinical records.
 * Renders an empty state if the doctor hasn't completed the review yet.
 *
 * @param soap - SOAP note from the consultation full report.
 * @param conditions - Confirmed FHIR Conditions.
 * @param observations - Confirmed FHIR Observations.
 * @param medications - Confirmed FHIR MedicationRequests.
 * @param serviceRequests - Confirmed FHIR ServiceRequests.
 */
export function DoctorReportSection({
  soap,
  conditions,
  observations,
  medications,
  serviceRequests,
  onUploadResult,
}: DoctorReportSectionProps) {
  const hasSoap = soap != null;
  const hasFhirData =
    conditions.length > 0 ||
    observations.length > 0 ||
    medications.length > 0 ||
    serviceRequests.length > 0;

  /* Empty state — doctor hasn't confirmed the review yet */
  if (!hasSoap && !hasFhirData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Clock className="size-10 opacity-40" />
          <p className="text-sm text-center">
            Doctor&apos;s report hasn&apos;t been added yet.
          </p>
          <p className="text-xs text-center max-w-xs">
            This will be available after the doctor completes the post-consultation
            review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Doctor&apos;s Report</h2>
        </div>

        {/* SOAP Note */}
        {hasSoap && (
          <>
            <SoapNoteView soap={soap!} />
          </>
        )}

        {/* FHIR records */}
        {hasFhirData && (
          <>
            {hasSoap && <Separator />}
            <div className="space-y-4">
              <ConditionList conditions={conditions} />
              {conditions.length > 0 && observations.length > 0 && <Separator />}
              <ObservationList observations={observations} />
              {(conditions.length > 0 || observations.length > 0) &&
                medications.length > 0 && <Separator />}
              <MedicationList medications={medications} />
              {(conditions.length > 0 ||
                observations.length > 0 ||
                medications.length > 0) &&
                serviceRequests.length > 0 && <Separator />}
              <ServiceRequestList
                serviceRequests={serviceRequests}
                onUploadResult={onUploadResult}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
