/**
 * AppointmentReview — post-consultation clinical review UI.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * Two-column layout, resizable (ResizablePanelGroup — drag the divider to
 * favour either side; defaults to roughly 35/65):
 *   Left  — SoapEditor (editable SOAP note from the AI full-report-agent), with
 *           the Re-extract trigger on its header — see handleReExtract.
 *   Right — ClinicalExtractionPanel (Conditions, Observations, Medications, Orders)
 *
 * Pre-population, in priority order:
 *   1. An autosaved draft (draft prop) — an unconfirmed edit from a session
 *      the doctor left before hitting Confirm & Save. Wins over everything
 *      else because it's always strictly newer than the saved FHIR records.
 *   2. Saved FHIR records (savedXxx props) — a previously confirmed review.
 *   3. The AI full-report (fullReport prop) — first-ever review.
 *
 * While the doctor edits, the SOAP note and all four extraction lists are
 * autosaved on a debounce (see saveDraftNow / debouncedSaveDraft) into the
 * Consultation record's draft_* columns — independent of the confirmed
 * columns, so typing never overwrites what's already in the EMR before the
 * doctor re-confirms. Once an encounter has been confirmed at least once
 * (publishedSnapshot is set), each card shows an "In EMR"/"Draft"
 * SyncStatusBadge so a doctor who edits an already-published encounter can
 * see exactly which items are still only local (see draftStatus.ts).
 *
 * On "Confirm & Save" the component diffs current state against what was loaded:
 *   - Items removed by the doctor  → DELETE
 *   - Items still present with a fhirId → UPDATE (code + status fields)
 *   - Newly added items (no fhirId) → CREATE (the new fhirId is merged back
 *     into local state immediately — see handleConfirm)
 * ...then clears the draft, since it's now identical to what was published.
 */

"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
  Sparkles,
  CloudCheck,
  FileClock,
  AlertTriangle,
} from "lucide-react";
import { BackButton } from "@/modules/client/telemedicine/shared/components/BackButton";
import { SoapEditor } from "./soap/SoapEditor";
import { ClinicalExtractionPanel } from "./clinical/ClinicalExtractionPanel";
import { AssessmentTab } from "../dashboard/ConsultationInsights";
import { publishClinicalRecords, type CreatedIdMap } from "./publishClinicalRecords";
import {
  saveClinicalDataAction,
  saveClinicalDraftAction,
} from "@/modules/server/presentation/actions/consultation/core.actions";
import { useDebouncedCallback } from "@/modules/client/shared/components/tables/hooks/use-debounced-callback";
import {
  conditionFromFhir,
  medicationFromFhir,
  observationFromFhir,
  serviceRequestFromFhir,
} from "./fromFhir";
import { formItemSyncStatus, isSoapSynced } from "./draftStatus";
import {
  fetchClinicalExtraction,
  type ClinicalExtractionResult,
} from "../clinical-records/reExtract";
import type {
  SoapNote,
  ConditionFormItem,
  ObservationFormItem,
  MedicationFormItem,
  ServiceRequestFormItem,
  StagingReport,
} from "./types";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";

/** Autosaved review-page draft, as read back from the Consultation record. */
export interface ReviewDraft {
  soapNote: SoapNote | null;
  conditions: ConditionFormItem[] | null;
  observations: ObservationFormItem[] | null;
  medicationRequests: MedicationFormItem[] | null;
  serviceRequests: ServiceRequestFormItem[] | null;
  /** Presence signal — null means there is no pending draft. */
  updatedAt: string | null;
}

/** The last-confirmed state this encounter's badges/diffing compare against. */
interface PublishedSnapshot {
  soap: SoapNote | null;
  conditions: ConditionFormItem[];
  observations: ObservationFormItem[];
  medications: MedicationFormItem[];
  serviceRequests: ServiceRequestFormItem[];
}

// ── Default / empty SOAP ──────────────────────────────────────────────────────

/** Blank SOAP note used when the AI did not generate one. */
const EMPTY_SOAP: SoapNote = {
  subjective: {
    chief_complaint: "",
    history_of_present_illness: "",
    associated_symptoms: [],
  },
  objective: { observations: [] },
  assessment: { possible_conditions: [], clinical_reasoning: "" },
  plan: { next_steps: [], when_to_seek_care: "" },
  summary: "",
};

/**
 * Fills in any missing SOAP sections/fields with EMPTY_SOAP defaults.
 *
 * The server-side SoapNoteSchema (entities/schemas/consultation/response.ts)
 * marks every section — subjective/objective/assessment/plan — optional,
 * because the AI agent's response can legitimately omit one. The SoapNote
 * type used throughout this file declares them required, so every entry
 * point that seeds `soap` state (the AI report, a published snapshot, an
 * autosaved draft) must go through this first — otherwise SoapEditor's child
 * sections (e.g. SubjectiveSection reading `data.chief_complaint`) crash on
 * a section that's actually undefined at runtime.
 *
 * @param raw - Possibly-incomplete SOAP note from any of those sources.
 * @returns A SoapNote with every section/field present.
 */
function normalizeSoapNote(raw: Partial<SoapNote> | null | undefined): SoapNote {
  return {
    subjective: { ...EMPTY_SOAP.subjective, ...raw?.subjective },
    objective: { ...EMPTY_SOAP.objective, ...raw?.objective },
    assessment: { ...EMPTY_SOAP.assessment, ...raw?.assessment },
    plan: { ...EMPTY_SOAP.plan, ...raw?.plan },
    summary: raw?.summary ?? EMPTY_SOAP.summary,
  };
}

/**
 * True when a SOAP note has no real content in any field.
 *
 * A "published" (Consultation.soap_note) or draft snapshot can itself be
 * blank — e.g. it was written back while the flat/wrapped shape mismatch
 * (see soapSource below) was silently blanking the note out, and a doctor
 * confirmed during that window. Since that snapshot normally outranks the
 * raw AI report when seeding `soap` state, an empty one would otherwise
 * permanently shadow the real note in full_report.soap_report, which was
 * never actually lost — just not being read. Treating an empty snapshot as
 * absent lets seeding fall through to the raw report instead.
 *
 * @param soap - A (possibly already-normalized) SOAP note to check.
 */
function isSoapNoteEmpty(soap: Partial<SoapNote> | null | undefined): boolean {
  if (!soap) return true;
  return (
    !soap.subjective?.chief_complaint &&
    !soap.subjective?.history_of_present_illness &&
    !soap.subjective?.associated_symptoms?.length &&
    !soap.objective?.observations?.length &&
    !soap.assessment?.possible_conditions?.length &&
    !soap.assessment?.clinical_reasoning &&
    !soap.plan?.next_steps?.length &&
    !soap.plan?.when_to_seek_care &&
    !soap.summary
  );
}

// ── AI extraction → FormItem converters ──────────────────────────────────────

/** Converts an AI-extracted condition to a ConditionFormItem (no fhirId — will be CREATEd). */
function toConditionItem(c: {
  display: string;
  terminologySystem: string;
}): ConditionFormItem {
  return { ...c, id: crypto.randomUUID() };
}

/** Converts an AI-extracted observation to an ObservationFormItem (no fhirId — will be CREATEd). */
function toObservationItem(o: {
  display: string;
  terminologySystem: string;
  value?: string | null;
  unit?: string | null;
}): ObservationFormItem {
  return {
    ...o,
    id: crypto.randomUUID(),
    value: o.value ?? null,
    unit: o.unit ?? null,
  };
}

/** Converts an AI-extracted medication to a MedicationFormItem (no fhirId — will be CREATEd). */
function toMedicationItem(m: {
  display: string;
  terminologySystem: string;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
}): MedicationFormItem {
  return {
    ...m,
    id: crypto.randomUUID(),
    dose: m.dose ?? null,
    frequency: m.frequency ?? null,
    duration: m.duration ?? null,
    route: m.route ?? null,
  };
}

/** Converts an AI-extracted service request to a ServiceRequestFormItem (no fhirId — will be CREATEd). */
function toServiceRequestItem(s: {
  display: string;
  terminologySystem: string;
}): ServiceRequestFormItem {
  return { ...s, id: crypto.randomUUID() };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentReviewProps {
  /** FHIR appointment integer ID — used in create action payloads. */
  fhirAppointmentId: number;
  /** FHIR patient integer ID — used as "Patient/<id>" subject on resources. */
  patientId: number;
  /** FHIR encounter integer ID — linked to each created FHIR resource. */
  encounterId: number;
  /** Patient display name shown in the header. */
  patientName: string;
  /** Doctor display name shown in the header. */
  doctorName: string;
  /** Appointment date string for display. */
  appointmentDate?: string | null;
  /**
   * Full report from the AI full-report-agent (stored on the Consultation record).
   * Contains the SOAP note and clinical extraction seeds.
   */
  fullReport?: unknown;
  /**
   * Sibling field on the same Consultation.full_report — risk level, clinical
   * overview, differential diagnosis, diagnostic/treatment plan, red flags.
   * Shown as a read-only reference section (not part of the editable SOAP
   * note or the saved clinical extraction — it has no FHIR resource of its
   * own, so there's nothing here to diff/save).
   */
  assessmentPlan?: Record<string, unknown> | null;
  /**
   * Existing FHIR Conditions linked to this encounter (from a previous save).
   * When non-empty, these take precedence over the AI extraction for initial state.
   */
  savedConditions?: TConditionResponse[];
  /** Existing FHIR Observations linked to this encounter. */
  savedObservations?: TObservationResponse[];
  /** Existing FHIR MedicationRequests linked to this encounter. */
  savedMedications?: TMedicationRequestResponse[];
  /** Existing FHIR ServiceRequests linked to this encounter. */
  savedServiceRequests?: TServiceRequestResponse[];
  /**
   * When the doctor last confirmed this encounter's clinical data, or null if
   * it's never been confirmed. Gates whether per-item "In EMR"/"Draft" badges
   * are meaningful — before the first confirm, everything is unconfirmed by
   * definition, so there's nothing to contrast a draft against.
   */
  publishedAt?: string | null;
  /** SOAP note as it stood after the last Confirm & Save (Consultation.soap_note). */
  publishedSoapNote?: SoapNote | null;
  /** Autosaved working copy from a previous session, if the doctor left before confirming. */
  draft?: ReviewDraft | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Post-consultation review component.
 * Renders an editable SOAP note alongside AI-extracted FHIR clinical resources.
 * On confirm, diffs current state against loaded state and creates/updates/deletes accordingly.
 *
 * @param fhirAppointmentId - Numeric FHIR appointment ID.
 * @param patientId - Numeric FHIR patient ID (used as subject reference).
 * @param encounterId - Numeric FHIR encounter ID to link all resources.
 * @param patientName - Patient display name.
 * @param doctorName - Doctor display name.
 * @param appointmentDate - Formatted date string for the header.
 * @param fullReport - Raw AI full-report-agent output for pre-population.
 * @param assessmentPlan - Sibling AI risk/differential-diagnosis assessment, read-only reference.
 * @param savedConditions - Existing FHIR Conditions for this encounter (revisit).
 * @param savedObservations - Existing FHIR Observations for this encounter (revisit).
 * @param savedMedications - Existing FHIR MedicationRequests for this encounter (revisit).
 * @param savedServiceRequests - Existing FHIR ServiceRequests for this encounter (revisit).
 * @param publishedAt - When this encounter was last confirmed, or null if never.
 * @param publishedSoapNote - SOAP note as of the last confirm.
 * @param draft - Autosaved working copy left over from a previous, unconfirmed session.
 */
export function AppointmentReview({
  /* Staging key for the approved-note write-back in handleConfirm. */
  fhirAppointmentId,
  patientId,
  encounterId,
  patientName,
  doctorName,
  appointmentDate,
  fullReport,
  assessmentPlan,
  savedConditions = [],
  savedObservations = [],
  savedMedications = [],
  savedServiceRequests = [],
  publishedAt = null,
  publishedSoapNote = null,
  draft = null,
}: AppointmentReviewProps) {
  const rawReport =
    fullReport && typeof fullReport === "object"
      ? (fullReport as Partial<StagingReport>)
      : null;

  /*
   * Older Consultation.full_report.soap_report values predate a later
   * contract change and store the SOAP fields flat (subjective/objective/…
   * directly at the top level) instead of wrapped as { soap, clinicalExtraction }
   * — this file's own StagingReport type only documents the newer wrapped
   * shape (soap is nested under it). Falling back to the raw object itself
   * when `.soap` is absent but it looks like a flat SoapNote (has a
   * `subjective` key) keeps those older consultations' notes readable
   * instead of silently blanking out. AI Assessment Plan is a sibling
   * full_report field that was never nested this way, so it isn't affected
   * by the drift — which is why it can render fine while this blanks out.
   */
  const soapSource: Partial<SoapNote> | undefined =
    rawReport?.soap ??
    (rawReport && "subjective" in rawReport
      ? (rawReport as unknown as SoapNote)
      : undefined);

  /* Seed SOAP note and clinical extraction lists from the AI report. */
  const report: StagingReport = {
    soap: normalizeSoapNote(soapSource),
    clinicalExtraction: {
      conditions: rawReport?.clinicalExtraction?.conditions ?? [],
      observations: rawReport?.clinicalExtraction?.observations ?? [],
      medicationRequests:
        rawReport?.clinicalExtraction?.medicationRequests ?? [],
      serviceRequests: rawReport?.clinicalExtraction?.serviceRequests ?? [],
    },
  };

  /* Detect whether a previous save exists for this encounter. */
  const hasSaved =
    savedConditions.length > 0 ||
    savedObservations.length > 0 ||
    savedMedications.length > 0 ||
    savedServiceRequests.length > 0;

  /* An autosaved draft, if the doctor left before hitting Confirm & Save last
     time. draft_updated_at is the only presence signal — the draft_* arrays
     can be stale/absent otherwise (see draft-status.ts / the Prisma schema
     comment on Consultation.draft_updated_at). */
  const hasDraft = !!draft?.updatedAt;

  /* Form state — priority: unconfirmed draft > saved FHIR records > AI report.
     The draft wins over saved FHIR records because it's strictly newer: it's
     only ever written after the page loaded with those saved records already
     in hand. */
  const [soap, setSoap] = useState<SoapNote>(
    hasDraft && draft?.soapNote && !isSoapNoteEmpty(draft.soapNote)
      ? normalizeSoapNote(draft.soapNote)
      : publishedSoapNote && !isSoapNoteEmpty(publishedSoapNote)
        ? normalizeSoapNote(publishedSoapNote)
        : report.soap,
  );
  /* Read-only Assessment Plan reference section — collapsed by default so it
     doesn't compete with the SOAP note for space on first paint. */
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [conditions, setConditions] = useState<ConditionFormItem[]>(
    hasDraft && draft?.conditions
      ? draft.conditions
      : hasSaved
        ? savedConditions.map(conditionFromFhir)
        : report.clinicalExtraction.conditions.map(toConditionItem),
  );
  const [observations, setObservations] = useState<ObservationFormItem[]>(
    hasDraft && draft?.observations
      ? draft.observations
      : hasSaved
        ? savedObservations.map(observationFromFhir)
        : report.clinicalExtraction.observations.map(toObservationItem),
  );
  const [medications, setMedications] = useState<MedicationFormItem[]>(
    hasDraft && draft?.medicationRequests
      ? draft.medicationRequests
      : hasSaved
        ? savedMedications.map(medicationFromFhir)
        : report.clinicalExtraction.medicationRequests.map(toMedicationItem),
  );
  const [serviceRequests, setServiceRequests] = useState<
    ServiceRequestFormItem[]
  >(
    hasDraft && draft?.serviceRequests
      ? draft.serviceRequests
      : hasSaved
        ? savedServiceRequests.map(serviceRequestFromFhir)
        : report.clinicalExtraction.serviceRequests.map(toServiceRequestItem),
  );
  const [isPending, startTransition] = useTransition();
  /* Separate from isPending (Confirm & Save) — the two actions are
     independent and shouldn't disable each other's button while either runs. */
  const [isExtracting, startExtractTransition] = useTransition();

  /* Whether this encounter has ever been confirmed before — either it has
     saved FHIR resources, or published_at is set even with an empty
     extraction (SOAP-only confirm). Either alone can miss the other case. */
  const hasBeenPublished = hasSaved || publishedAt != null;

  /*
   * The last-confirmed state this encounter's per-item badges compare
   * against. Only set when something has actually been confirmed before —
   * on a first-ever review there's no EMR baseline yet, so every item is
   * unconfirmed by definition and badges would be pure noise.
   * Updated again after a successful Confirm & Save (see handleConfirm) so
   * badges stay correct for the rest of this session without a refetch.
   */
  const [publishedSnapshot, setPublishedSnapshot] = useState<PublishedSnapshot | null>(
    hasBeenPublished
      ? {
          soap: publishedSoapNote,
          conditions: savedConditions.map(conditionFromFhir),
          observations: savedObservations.map(observationFromFhir),
          medications: savedMedications.map(medicationFromFhir),
          serviceRequests: savedServiceRequests.map(serviceRequestFromFhir),
        }
      : null,
  );

  /* Draft autosave status — surfaced in the header next to Confirm & Save. */
  const [draftSaveState, setDraftSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(
    hasDraft && draft?.updatedAt ? new Date(draft.updatedAt) : null,
  );
  /* Skip the very first autosave-effect run — it fires on mount with the
     just-seeded state, which is already persisted (or doesn't need to be). */
  const skippedFirstAutosave = useRef(false);

  /*
   * Track the FHIR IDs that were present at page load.
   * Used during save to detect which records the doctor deleted (present at load, absent now).
   */
  const initialFhirIds = useRef({
    conditions: new Set(savedConditions.map((c) => c.id)),
    observations: new Set(savedObservations.map((o) => o.id)),
    medications: new Set(savedMedications.map((m) => m.id)),
    serviceRequests: new Set(savedServiceRequests.map((s) => s.id)),
  });

  const subject = `Patient/${patientId}`;

  /* Per-item EMR sync status, recomputed whenever the list or the published
     baseline changes. Undefined (not "draft") before the first confirm —
     see SyncStatusBadge for why that distinction matters. */
  const getConditionSyncStatus = useCallback(
    (item: ConditionFormItem) =>
      publishedSnapshot
        ? formItemSyncStatus(item, publishedSnapshot.conditions)
        : undefined,
    [publishedSnapshot],
  );
  const getObservationSyncStatus = useCallback(
    (item: ObservationFormItem) =>
      publishedSnapshot
        ? formItemSyncStatus(item, publishedSnapshot.observations)
        : undefined,
    [publishedSnapshot],
  );
  const getMedicationSyncStatus = useCallback(
    (item: MedicationFormItem) =>
      publishedSnapshot
        ? formItemSyncStatus(item, publishedSnapshot.medications)
        : undefined,
    [publishedSnapshot],
  );
  const getServiceRequestSyncStatus = useCallback(
    (item: ServiceRequestFormItem) =>
      publishedSnapshot
        ? formItemSyncStatus(item, publishedSnapshot.serviceRequests)
        : undefined,
    [publishedSnapshot],
  );

  /* Whether anything on the page differs from what's already confirmed —
     drives the "Unsaved changes" banner. Only meaningful once there's a
     published baseline; before that, the whole page is one big unconfirmed
     draft and the ordinary "Confirm & Save" copy already says so. */
  const hasUnpublishedChanges = useMemo(() => {
    if (!publishedSnapshot) return false;
    return (
      !isSoapSynced(soap, publishedSnapshot.soap) ||
      conditions.some((c) => getConditionSyncStatus(c) === "draft") ||
      observations.some((o) => getObservationSyncStatus(o) === "draft") ||
      medications.some((m) => getMedicationSyncStatus(m) === "draft") ||
      serviceRequests.some((s) => getServiceRequestSyncStatus(s) === "draft")
    );
  }, [
    soap,
    conditions,
    observations,
    medications,
    serviceRequests,
    publishedSnapshot,
    getConditionSyncStatus,
    getObservationSyncStatus,
    getMedicationSyncStatus,
    getServiceRequestSyncStatus,
  ]);

  /**
   * Autosaves the current working copy so it survives a refresh or a closed
   * tab before the doctor clicks Confirm & Save. Fires on a debounce (see the
   * effect below) rather than on every keystroke — this call itself is
   * always "save whatever the state is right now".
   */
  const saveDraftNow = useCallback(() => {
    setDraftSaveState("saving");
    (async () => {
      try {
        const [, err] = await saveClinicalDraftAction({
          payload: {
            fhir_appointment_id: fhirAppointmentId,
            soap_note: soap,
            conditions,
            observations,
            medication_requests: medications,
            service_requests: serviceRequests,
          },
        });
        if (err) {
          console.error("[AppointmentReview] draft autosave failed:", err);
          setDraftSaveState("error");
          return;
        }
        setDraftSaveState("saved");
        setLastDraftSavedAt(new Date());
      } catch (err) {
        console.error("[AppointmentReview] draft autosave failed:", err);
        setDraftSaveState("error");
      }
    })();
  }, [fhirAppointmentId, soap, conditions, observations, medications, serviceRequests]);

  const debouncedSaveDraft = useDebouncedCallback(saveDraftNow, 2500);

  /* Autosave whenever the SOAP note or any extraction list changes — skips
     the initial mount so seeding the form doesn't immediately re-save the
     same data it was just seeded from. */
  useEffect(() => {
    if (!skippedFirstAutosave.current) {
      skippedFirstAutosave.current = true;
      return;
    }
    debouncedSaveDraft();
  }, [soap, conditions, observations, medications, serviceRequests, debouncedSaveDraft]);

  /* Best-effort flush when the doctor switches tabs or navigates away —
     debounce alone would otherwise drop an edit made just before either. */
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") saveDraftNow();
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [saveDraftNow]);

  /** Re-populates all four lists from a fresh clinical-extraction result. */
  const applyReExtraction = (result: ClinicalExtractionResult) => {
    setConditions(result.conditions.map(toConditionItem));
    setObservations(result.observations.map(toObservationItem));
    setMedications(result.medicationRequests.map(toMedicationItem));
    setServiceRequests(result.serviceRequests.map(toServiceRequestItem));
  };

  /**
   * Re-extract button handler — lives on the SOAP Note header rather than
   * beside the extraction panel it populates, because doctors read it as an
   * action on the note ("pull structured data out of what I just edited"),
   * not on the list it produces. Calls the agent with the current note and
   * replaces all four extraction lists with its output.
   */
  const handleReExtract = () => {
    startExtractTransition(async () => {
      try {
        const result = await fetchClinicalExtraction(
          soap,
          rawReport?.assessment,
        );
        applyReExtraction(result);
        toast.success("Clinical data re-extracted from updated SOAP note.");
      } catch (err) {
        console.error("[AppointmentReview] re-extract failed:", err);
        toast.error("Failed to re-extract clinical data. Please try again.");
      }
    });
  };

  /**
   * Publishes the current form state to the EMR.
   * Delegates the diff (CREATE / UPDATE / DELETE per resource type) to
   * publishClinicalRecords, then stores the surviving fhirIds so a second save
   * in the same session diffs against the right baseline. Items that were
   * just CREATEd get their new fhirId merged into local state too — otherwise
   * they'd keep showing as "Draft" even though they're now in the EMR.
   *
   * The approved SOAP note is then written back to the Consultation record.
   * FHIR receives the clinical resources but has nowhere to put the narrative
   * note, so without this step the doctor's edits to it exist only in this
   * component's state and are lost on navigation — leaving the Clinical Records
   * Note tab showing the raw AI draft rather than what was actually approved.
   * The four lists go with it so staging reflects the approved set too.
   *
   * Finally clears the autosaved draft: it's now identical to what was just
   * published, so keeping it around would only risk a stale draft outliving
   * a record it once described correctly.
   */
  const handleConfirm = () => {
    startTransition(async () => {
      try {
        /* Diff current state against what was loaded and write to FHIR. */
        const { initialFhirIds: nextInitialFhirIds, createdIds } =
          await publishClinicalRecords({
            conditions,
            observations,
            medications,
            serviceRequests,
            initialFhirIds: initialFhirIds.current,
            subject,
            encounterId,
          });
        initialFhirIds.current = nextInitialFhirIds;

        const mergeCreatedIds = <T extends { id: string; fhirId?: number }>(
          items: T[],
          created: CreatedIdMap,
        ): T[] =>
          created.size === 0
            ? items
            : items.map((item) =>
                created.has(item.id) ? { ...item, fhirId: created.get(item.id) } : item,
              );

        const nextConditions = mergeCreatedIds(conditions, createdIds.conditions);
        const nextObservations = mergeCreatedIds(observations, createdIds.observations);
        const nextMedications = mergeCreatedIds(medications, createdIds.medications);
        const nextServiceRequests = mergeCreatedIds(
          serviceRequests,
          createdIds.serviceRequests,
        );

        setConditions(nextConditions);
        setObservations(nextObservations);
        setMedications(nextMedications);
        setServiceRequests(nextServiceRequests);

        /* Persist the approved note. Reported separately from the publish
           above: the resources are already in the chart at this point, so a
           failure here is a partial success, not a failed save. */
        const [, saveErr] = await saveClinicalDataAction({
          payload: {
            fhir_appointment_id: fhirAppointmentId,
            soap_note: soap,
            conditions: nextConditions,
            observations: nextObservations,
            medication_requests: nextMedications,
            service_requests: nextServiceRequests,
            /* Confirming here is the doctor's approval — the one place that
               stamps it. The server sets the timestamp and reads the approver
               from the session; this only signals intent. */
            mark_published: true,
          },
        });

        if (saveErr) {
          console.error("[AppointmentReview] note save failed:", saveErr);
          toast.warning(
            "Clinical records saved, but the consultation note could not be stored.",
          );
          return;
        }

        /* Update the badge baseline in-session — a page refresh would derive
           the same thing from the server, but the doctor shouldn't have to
           refresh to see items they just published as "In EMR". */
        setPublishedSnapshot({
          soap,
          conditions: nextConditions,
          observations: nextObservations,
          medications: nextMedications,
          serviceRequests: nextServiceRequests,
        });

        /* The draft now matches what's published — clear it so a refresh
           doesn't rehydrate stale draft content. Best-effort: a failure here
           just leaves a harmless, already-superseded draft behind. */
        try {
          const [, clearErr] = await saveClinicalDraftAction({
            payload: { fhir_appointment_id: fhirAppointmentId, clear: true },
          });
          if (clearErr) {
            console.error("[AppointmentReview] draft clear failed:", clearErr);
          }
        } catch (clearErr) {
          console.error("[AppointmentReview] draft clear failed:", clearErr);
        }
        setLastDraftSavedAt(null);
        setDraftSaveState("idle");

        toast.success("Clinical records saved to patient medical history.");
      } catch (err) {
        console.error("[AppointmentReview] save failed:", err);
        toast.error("Failed to save some records. Please try again.");
      }
    });
  };

  return (
    // 156
    <div className="flex flex-col h-[calc(100dvh-132px)] gap-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          <BackButton />
          <Separator orientation="vertical" className="h-8" />
          <div>
            <p className="text-sm font-semibold">Post-Consultation Review</p>
            <p className="text-xs text-muted-foreground">
              Review and confirm AI-generated clinical data before saving to
              records
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{patientName}</span>
          </div>
          {appointmentDate && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{appointmentDate}</span>
              </div>
            </>
          )}
          <Badge variant="secondary" className="text-xs">
            {doctorName}
          </Badge>
          {hasUnpublishedChanges && (
            <Badge
              variant="outline"
              className="gap-1 text-xs text-amber-600 border-amber-600/30 bg-amber-500/10"
            >
              <AlertTriangle className="h-3 w-3" />
              Unpublished changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave status — reassures the doctor nothing typed is lost
              before they explicitly confirm. */}
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {draftSaveState === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving draft…
              </>
            )}
            {draftSaveState === "saved" && lastDraftSavedAt && (
              <>
                <CloudCheck className="h-3 w-3 text-emerald-600" />
                Draft saved{" "}
                {lastDraftSavedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </>
            )}
            {draftSaveState === "error" && (
              <>
                <FileClock className="h-3 w-3 text-destructive" />
                Draft save failed — will retry on next edit
              </>
            )}
          </span>
          <Button
            onClick={handleConfirm}
            size="sm"
            className="gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isPending ? "Saving..." : "Confirm & Save to Records"}
          </Button>
        </div>
      </div>

      {/* ── Two-column body ──
          Resizable: defaults roughly match the old fixed 420px/flex-1 split
          (~35/65 on a typical review-page width), but a doctor can drag the
          divider either way — a long SOAP note or a long extraction list both
          happen, and neither should be stuck at a fixed share of the screen. */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
        {/* Left: SOAP editor */}
        <ResizablePanel
          id="soap-note"
          defaultSize={35}
          minSize={25}
          className="flex flex-col min-h-0 border-r"
        >
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">SOAP Note</p>
                <p className="text-xs text-muted-foreground">
                  Edit and review clinical notes
                </p>
              </div>
              {publishedSnapshot && !isSoapSynced(soap, publishedSnapshot.soap) && (
                <Badge
                  variant="outline"
                  className="gap-1 shrink-0 text-xs text-amber-600 border-amber-600/30 bg-amber-500/10"
                >
                  <FileClock className="h-3 w-3" />
                  Draft
                </Badge>
              )}
            </div>
            {/* Reads as an action on the note, not on the extraction list it
                populates — moved here from the Clinical Extraction panel. */}
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 text-xs h-8"
              onClick={handleReExtract}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isExtracting ? "Extracting…" : "Re-extract"}
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Read-only reference — the AI's risk/differential-diagnosis
                  assessment from the same full_report as the SOAP note
                  below, but with no FHIR resource of its own, so it isn't
                  part of the editable note or the save/diff flow on the
                  right. Collapsed by default; expand for context while
                  reviewing. */}
              {assessmentPlan && (
                <div className="rounded-lg border bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 h-9 text-xs text-muted-foreground"
                    onClick={() => setAssessmentOpen((v) => !v)}
                  >
                    <span className="font-medium">
                      AI Assessment Plan (reference only)
                    </span>
                    {assessmentOpen ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </Button>
                  {assessmentOpen && (
                    <div className="border-t px-3 pt-3 pb-1">
                      <AssessmentTab plan={assessmentPlan} />
                    </div>
                  )}
                </div>
              )}
              <SoapEditor soap={soap} onChange={setSoap} />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Clinical extraction panel */}
        <ResizablePanel
          id="clinical-extraction"
          defaultSize={65}
          minSize={40}
          className="flex flex-col min-h-0"
        >
          <div className="px-4 py-3 border-b shrink-0">
            <p className="text-sm font-medium">Clinical Extraction</p>
            <p className="text-xs text-muted-foreground">
              {hasSaved
                ? "Previously saved records loaded — edit and save to sync changes"
                : "Confirm terminology codes — AI suggestions are pre-loaded"}
            </p>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <ClinicalExtractionPanel
              conditions={conditions}
              observations={observations}
              medications={medications}
              serviceRequests={serviceRequests}
              onConditionsChange={setConditions}
              onObservationsChange={setObservations}
              onMedicationsChange={setMedications}
              onServiceRequestsChange={setServiceRequests}
              getConditionSyncStatus={getConditionSyncStatus}
              getObservationSyncStatus={getObservationSyncStatus}
              getMedicationSyncStatus={getMedicationSyncStatus}
              getServiceRequestSyncStatus={getServiceRequestSyncStatus}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
