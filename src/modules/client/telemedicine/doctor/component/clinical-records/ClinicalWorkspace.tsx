/**
 * ClinicalWorkspace — step 3 of the doctor's Clinical Records drill-down.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The full clinical record for one appointment, across five tabs: Summary,
 * Diagnoses, Prescriptions, Orders and Documents. This component owns all
 * editable state so that a single autosave and a single publish cover
 * everything the doctor typed, wherever they typed it.
 *
 * Staging → publish (the model already used by the post-consultation review):
 *
 *   1. Edits live in local state and debounce-autosave to the Consultation row
 *      via saveClinicalDataAction — this is the staging area, local Postgres.
 *   2. "Publish to EMR" runs publishClinicalRecords, which diffs against the
 *      FHIR IDs loaded at mount and CREATEs / UPDATEs / DELETEs real resources.
 *
 * Seed priority is: published FHIR records → staged draft → AI full report.
 * Published records win because they carry fhirId, which is what makes an edit
 * an update rather than a duplicate.
 */

"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  FileStack,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
/* Imported from the hook file rather than the tables barrel — the barrel also
   re-exports the PDF/Excel export utilities, which would land in this bundle. */
import { useDebouncedCallback } from "@/modules/client/shared/components/tables/hooks/use-debounced-callback";
import { saveClinicalDataAction } from "@/modules/server/presentation/actions/consultation/core.actions";

import { publishClinicalRecords } from "../appointment-review/publishClinicalRecords";
import {
  conditionFromFhir,
  medicationFromFhir,
  observationFromFhir,
  serviceRequestFromFhir,
} from "../appointment-review/fromFhir";
import {
  normaliseConditions,
  normaliseMedications,
  normaliseObservations,
  normaliseServiceRequests,
  seedSoapNote,
} from "./clinicalDraft";
import {
  countPublished,
  fetchClinicalExtraction,
  toFormItems,
} from "./reExtract";
import { ConsultationNoteCanvas } from "./note/ConsultationNoteCanvas";
import { SummaryTab } from "./tabs/SummaryTab";
import { DiagnosesTab } from "./tabs/DiagnosesTab";
import { PrescriptionsTab } from "./tabs/PrescriptionsTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { IntakeTab } from "./tabs/IntakeTab";

import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
  SoapNote,
} from "../appointment-review/types";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TEncounterResponse } from "@/modules/entities/schemas/encounter";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";
import type { TConsultationTranscriptMessage } from "@/modules/entities/schemas/consultation";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Debounce before an edit is written to staging. Long enough that typing a
 * sentence is one write, short enough that navigating away rarely loses work.
 */
const AUTOSAVE_DELAY_MS = 1200;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Draft state staged on the Consultation row, as loaded by the server page. */
export interface StagedClinicalDraft {
  conditions: unknown;
  observations: unknown;
  medicationRequests: unknown;
  serviceRequests: unknown;
  soapNote: unknown;
}

export interface ClinicalWorkspaceProps {
  /** FHIR Appointment.id — the staging key on the Consultation row. */
  appointmentId: number;
  /** FHIR Patient.id — subject reference for every created resource. */
  patientId: number;
  /** The appointment being documented. */
  appointment: TAppointmentResponse;
  /** Every Encounter linked to the appointment. */
  encounters: TEncounterResponse[];
  /**
   * The encounter all created resources link to — the first of `encounters`.
   * Null when the consultation produced none, which disables publishing.
   */
  encounterId: number | null;
  /** Patient display name for headers and the printable prescription. */
  patientName: string;
  /** Doctor display name for headers and the printable prescription. */
  doctorName: string;
  /** Formatted appointment date for headers. */
  appointmentDate: string | null;
  /** Conditions already published to the EMR for this encounter. */
  savedConditions: TConditionResponse[];
  /** Observations already published to the EMR for this encounter. */
  savedObservations: TObservationResponse[];
  /** MedicationRequests already published to the EMR for this encounter. */
  savedMedications: TMedicationRequestResponse[];
  /** ServiceRequests already published to the EMR for this encounter. */
  savedServiceRequests: TServiceRequestResponse[];
  /** DiagnosticReports for the encounter — resolves uploaded order results. */
  diagnosticReports: TDiagnosticReportResponse[];
  /** DocumentReferences attached to the encounter. */
  documents: TDocumentReferenceResponse[];
  /** Draft staged on the Consultation row, if any. */
  staged: StagedClinicalDraft;
  /** SOAP note from the AI full report — the first-visit seed. */
  aiSoapNote: unknown;
  /** Intake record for the Intake tab, or null when the patient completed none. */
  intake: TIntakeResponse | null;
  /** Live consultation transcript for the Intake tab, possibly empty. */
  transcript: TConsultationTranscriptMessage[];
  /** Raw AI assessment passed to the extraction agent as extra context. */
  aiAssessment?: unknown;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Tabbed clinical record workspace for a single appointment.
 *
 * @param props - Appointment context, published FHIR records, staged draft and
 *                AI seed, as resolved by the server page.
 */
export function ClinicalWorkspace({
  appointmentId,
  patientId,
  appointment,
  encounters,
  encounterId,
  patientName,
  doctorName,
  appointmentDate,
  savedConditions,
  savedObservations,
  savedMedications,
  savedServiceRequests,
  diagnosticReports,
  documents,
  staged,
  aiSoapNote,
  intake,
  transcript,
  aiAssessment,
}: ClinicalWorkspaceProps) {
  const router = useRouter();

  /* Anything already in the EMR takes precedence over the staged draft. */
  const hasPublished =
    savedConditions.length > 0 ||
    savedObservations.length > 0 ||
    savedMedications.length > 0 ||
    savedServiceRequests.length > 0;

  // ── Form state ──────────────────────────────────────────────────────────────

  const [soap, setSoap] = useState<SoapNote>(() =>
    seedSoapNote(staged.soapNote, aiSoapNote),
  );
  const [conditions, setConditions] = useState<ConditionFormItem[]>(() =>
    hasPublished
      ? savedConditions.map(conditionFromFhir)
      : normaliseConditions(staged.conditions),
  );
  const [observations, setObservations] = useState<ObservationFormItem[]>(() =>
    hasPublished
      ? savedObservations.map(observationFromFhir)
      : normaliseObservations(staged.observations),
  );
  const [medications, setMedications] = useState<MedicationFormItem[]>(() =>
    hasPublished
      ? savedMedications.map(medicationFromFhir)
      : normaliseMedications(staged.medicationRequests),
  );
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestFormItem[]>(
    () =>
      hasPublished
        ? savedServiceRequests.map(serviceRequestFromFhir)
        : normaliseServiceRequests(staged.serviceRequests),
  );

  // ── Save / publish status ───────────────────────────────────────────────────

  /** Draft indicator shown in the header. */
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [isPublishing, startPublish] = useTransition();
  /** True once the doctor has published in this session — flips the header badge. */
  const [publishedNow, setPublishedNow] = useState(false);

  /** FHIR IDs present at mount — the baseline the publish diff works against. */
  const initialFhirIds = useRef({
    conditions: new Set(savedConditions.map((c) => c.id)),
    observations: new Set(savedObservations.map((o) => o.id)),
    medications: new Set(savedMedications.map((m) => m.id)),
    serviceRequests: new Set(savedServiceRequests.map((s) => s.id)),
  });

  const subject = `Patient/${patientId}`;

  // ── Draft autosave ──────────────────────────────────────────────────────────

  /**
   * Writes the current draft to the Consultation staging row.
   * Debounced by the caller — never call this directly from a change handler.
   *
   * @param draft - The complete draft snapshot to stage.
   */
  const saveDraft = useCallback(
    async (draft: {
      soap: SoapNote;
      conditions: ConditionFormItem[];
      observations: ObservationFormItem[];
      medications: MedicationFormItem[];
      serviceRequests: ServiceRequestFormItem[];
    }) => {
      setDraftState("saving");
      const [, err] = await saveClinicalDataAction({
        payload: {
          fhir_appointment_id: appointmentId,
          soap_note: draft.soap,
          conditions: draft.conditions,
          observations: draft.observations,
          medication_requests: draft.medications,
          service_requests: draft.serviceRequests,
        },
      });
      setDraftState(err ? "error" : "saved");
    },
    [appointmentId],
  );

  const scheduleSave = useDebouncedCallback(saveDraft, AUTOSAVE_DELAY_MS);

  /**
   * Applies a state change and stages the resulting draft.
   *
   * Every tab funnels its edits through here so the autosave always sees a
   * complete snapshot — passing only the changed slice would stage a draft
   * where the other four are whatever they were on the last save.
   *
   * @param patch - The slice of draft state that changed.
   */
  const commit = useCallback(
    (patch: {
      soap?: SoapNote;
      conditions?: ConditionFormItem[];
      observations?: ObservationFormItem[];
      medications?: MedicationFormItem[];
      serviceRequests?: ServiceRequestFormItem[];
    }) => {
      const next = {
        soap: patch.soap ?? soap,
        conditions: patch.conditions ?? conditions,
        observations: patch.observations ?? observations,
        medications: patch.medications ?? medications,
        serviceRequests: patch.serviceRequests ?? serviceRequests,
      };

      if (patch.soap) setSoap(patch.soap);
      if (patch.conditions) setConditions(patch.conditions);
      if (patch.observations) setObservations(patch.observations);
      if (patch.medications) setMedications(patch.medications);
      if (patch.serviceRequests) setServiceRequests(patch.serviceRequests);

      scheduleSave(next);
    },
    [soap, conditions, observations, medications, serviceRequests, scheduleSave],
  );

  // ── Re-extract ──────────────────────────────────────────────────────────────

  /** True while the extraction agent request is in flight. */
  const [isExtracting, setIsExtracting] = useState(false);
  /** Open state for the confirm shown when published entries would be replaced. */
  const [confirmReExtract, setConfirmReExtract] = useState(false);

  /** How many current entries already exist in the EMR. */
  const publishedCount = countPublished({
    conditions,
    observations,
    medications,
    serviceRequests,
  });

  /**
   * Re-runs the extraction agent over the current note and replaces all four
   * lists with the result. Staged through commit() like any other edit.
   */
  const runReExtract = useCallback(async () => {
    setIsExtracting(true);
    try {
      const result = await fetchClinicalExtraction(soap, aiAssessment);
      const next = toFormItems(result);
      commit({
        conditions: next.conditions,
        observations: next.observations,
        medications: next.medications,
        serviceRequests: next.serviceRequests,
      });
      toast.success("Clinical entries regenerated from the note.");
    } catch (err) {
      console.error("[ClinicalWorkspace] re-extract failed:", err);
      toast.error("Could not regenerate entries. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  }, [soap, aiAssessment, commit]);

  /**
   * Entry point for the header action — confirms first when the replacement
   * would discard entries that are already in the EMR.
   */
  function handleReExtractClick() {
    if (publishedCount > 0) {
      setConfirmReExtract(true);
      return;
    }
    void runReExtract();
  }

  // ── Publish ─────────────────────────────────────────────────────────────────

  /**
   * Publishes the draft to the EMR, then refreshes so the page re-reads the
   * newly created resources (which is what gives new items their fhirId).
   */
  const handlePublish = () => {
    if (encounterId == null) {
      toast.error("No encounter for this appointment — nothing to publish to.");
      return;
    }

    startPublish(async () => {
      try {
        initialFhirIds.current = await publishClinicalRecords({
          conditions,
          observations,
          medications,
          serviceRequests,
          initialFhirIds: initialFhirIds.current,
          subject,
          encounterId,
        });

        setPublishedNow(true);
        toast.success("Clinical record published to the patient's EMR.");

        /* Re-read from FHIR so newly created items come back with their ids. */
        router.refresh();
      } catch (err) {
        console.error("[ClinicalWorkspace] publish failed:", err);
        toast.error("Failed to publish some records. Please try again.");
      }
    });
  };

  // ── Header status ───────────────────────────────────────────────────────────

  /** Human-readable draft indicator for the header. */
  const draftLabel =
    draftState === "saving"
      ? "Saving draft…"
      : draftState === "saved"
        ? "Draft saved"
        : draftState === "error"
          ? "Draft not saved"
          : null;

  const isPublished = hasPublished || publishedNow;

  return (
    <div className="space-y-4">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 -mx-1 rounded-md border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Clinical Record</p>
            <p className="text-xs text-muted-foreground">
              Edits stage as a draft until you publish
            </p>
          </div>

          <Separator orientation="vertical" className="h-8 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5" />
            <span className="truncate">{patientName}</span>
          </div>

          {appointmentDate && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{appointmentDate}</span>
            </div>
          )}

          <Badge variant="secondary" className="text-xs font-normal">
            {doctorName}
          </Badge>

          <div className="ml-auto flex items-center gap-3">
            {draftLabel && (
              <span
                className={
                  draftState === "error"
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {draftLabel}
              </span>
            )}

            <Badge
              variant={isPublished ? "secondary" : "outline"}
              className="text-xs font-normal"
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>

            {/* Regenerates all four entry lists from the current note */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleReExtractClick}
              disabled={isExtracting || isPublishing}
            >
              {isExtracting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isExtracting ? "Extracting…" : "Re-extract"}
            </Button>

            <Button
              size="sm"
              className="gap-2"
              onClick={handlePublish}
              disabled={isPublishing || encounterId == null}
            >
              {isPublishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CloudUpload className="size-4" />
              )}
              {isPublishing ? "Publishing…" : "Publish to EMR"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="note" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto print:hidden">
          <TabsTrigger value="note" className="gap-1.5">
            <FileText className="size-3.5" />
            Note
          </TabsTrigger>
          <TabsTrigger value="diagnoses" className="gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Diagnoses
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5">
            <Pill className="size-3.5" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <FlaskConical className="size-3.5" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileStack className="size-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="intake" className="gap-1.5">
            <Brain className="size-3.5" />
            Intake
          </TabsTrigger>
          <TabsTrigger value="visit" className="gap-1.5">
            <Stethoscope className="size-3.5" />
            Visit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="note" className="mt-4">
          <ConsultationNoteCanvas
            soap={soap}
            onChange={(next) => commit({ soap: next })}
            patientName={patientName}
            doctorName={doctorName}
            appointmentDate={appointmentDate}
          />
        </TabsContent>

        <TabsContent value="visit" className="mt-4">
          <SummaryTab appointment={appointment} encounters={encounters} />
        </TabsContent>

        <TabsContent value="diagnoses" className="mt-4">
          <DiagnosesTab
            conditions={conditions}
            onConditionsChange={(next) => commit({ conditions: next })}
            observations={observations}
            onObservationsChange={(next) => commit({ observations: next })}
          />
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <PrescriptionsTab
            medications={medications}
            onMedicationsChange={(next) => commit({ medications: next })}
            patientName={patientName}
            doctorName={doctorName}
            appointmentDate={appointmentDate}
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <OrdersTab
            serviceRequests={serviceRequests}
            onServiceRequestsChange={(next) => commit({ serviceRequests: next })}
            diagnosticReports={diagnosticReports}
            patientId={patientId}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab
            documents={documents}
            patientId={patientId}
            encounterId={encounterId}
          />
        </TabsContent>

        <TabsContent value="intake" className="mt-4">
          <IntakeTab intake={intake} transcript={transcript} />
        </TabsContent>
      </Tabs>

      {/* ── Re-extract confirm ── */}
      <AlertDialog open={confirmReExtract} onOpenChange={setConfirmReExtract}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace clinical entries?</AlertDialogTitle>
            <AlertDialogDescription>
              Re-extracting rebuilds all diagnoses, findings, prescriptions and
              orders from the note.{" "}
              <strong>
                {publishedCount} {publishedCount === 1 ? "entry" : "entries"}
              </strong>{" "}
              already in the EMR will be replaced with new records when you next
              publish, and any manual edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runReExtract()}>
              Replace entries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
