/**
 * persistEntry — write one clinical entry straight to the EMR.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * The Clinical Records workspace is not a staging area. The doctor working
 * here is editing the patient's record, so each entry is created, updated or
 * deleted in FHIR as they save it — there is no draft to publish afterwards.
 *
 * Contrast with publishClinicalRecords, which the post-consultation review page
 * still uses: there the doctor is accepting a batch of AI suggestions in one
 * act, so a diff-and-publish is the right shape. Both build their payloads from
 * clinicalPayloads.ts, so the two paths cannot disagree about what a saved
 * entry looks like.
 *
 * Every function returns the entry's FHIR id. On create that is the id the
 * server just assigned, which the caller writes back into local state — without
 * it the next save would create a duplicate instead of updating.
 */

import {
  createConditionAction,
  updateConditionAction,
  deleteConditionAction,
} from "@/modules/server/presentation/actions/condition/core.actions";
import {
  createObservationAction,
  updateObservationAction,
  deleteObservationAction,
} from "@/modules/server/presentation/actions/observation/core.actions";
import {
  createMedicationRequestAction,
  updateMedicationRequestAction,
  deleteMedicationRequestAction,
} from "@/modules/server/presentation/actions/medication-request/core.actions";
import {
  createServiceRequestAction,
  updateServiceRequestAction,
  deleteServiceRequestAction,
} from "@/modules/server/presentation/actions/service-request/core.actions";
import { toast } from "sonner";
import {
  conditionCreatePayload,
  conditionUpdatePayload,
  medicationCreateOnlyFieldsChanged,
  medicationCreatePayload,
  medicationUpdatePayload,
  observationCreatePayload,
  observationUpdatePayload,
  serviceRequestCreatePayload,
  serviceRequestUpdatePayload,
  type ClinicalWriteContext,
} from "../appointment-review/clinicalPayloads";
import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "../appointment-review/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Which resource an entry belongs to. */
export type ClinicalEntryKind =
  | "condition"
  | "observation"
  | "medication"
  | "serviceRequest";

/** The four form item shapes, keyed by kind. */
export interface ClinicalEntryByKind {
  condition: ConditionFormItem;
  observation: ObservationFormItem;
  medication: MedicationFormItem;
  serviceRequest: ServiceRequestFormItem;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Unwraps a ZSA action result, throwing on failure.
 *
 * ZSA returns `[data, error]` rather than rejecting, so a failed write would
 * otherwise look like a success and the doctor would be told their entry saved
 * when it did not.
 *
 * @param result - The `[data, error]` tuple from a server action.
 * @returns The created or updated resource id.
 * @throws Error carrying the action's message when the write failed.
 */
function unwrapId(
  result: readonly [{ id?: number } | null, { message?: string } | null],
): number {
  const [data, err] = result;
  if (err) throw new Error(err.message ?? "The record could not be saved.");
  if (data?.id == null) throw new Error("The server did not return a record id.");
  return data.id;
}

/**
 * Unwraps a delete result, which returns no useful payload.
 *
 * @param result - The `[data, error]` tuple from a delete action.
 * @throws Error carrying the action's message when the delete failed.
 */
function assertOk(
  result: readonly [unknown, { message?: string } | null],
): void {
  const [, err] = result;
  if (err) throw new Error(err.message ?? "The record could not be removed.");
}

// ── Save ──────────────────────────────────────────────────────────────────────

/**
 * Creates or updates one clinical entry in FHIR.
 *
 * Which it does is decided by `fhirId`: an entry that already carries one is
 * updated in place, one that does not is created.
 *
 * @param kind - Which resource the entry is.
 * @param item - The entry to write.
 * @param ctx - Subject and encounter for creates.
 * @param original - The entry as it was before this edit, when editing an
 *   existing one. Only medication uses it, to detect edits to fields that
 *   fhir-gql cannot update in place (see medicationCreateOnlyFieldsChanged).
 * @returns The entry's FHIR id — newly assigned on create.
 * @throws Error when the write fails; callers surface it as a toast.
 */
export async function persistClinicalEntry<K extends ClinicalEntryKind>(
  kind: K,
  item: ClinicalEntryByKind[K],
  ctx: ClinicalWriteContext,
  original?: ClinicalEntryByKind[K],
): Promise<number> {
  switch (kind) {
    case "condition": {
      const c = item as ConditionFormItem;
      return c.fhirId != null
        ? unwrapId(
            await updateConditionAction({ payload: conditionUpdatePayload(c) }),
          )
        : unwrapId(
            await createConditionAction({
              payload: conditionCreatePayload(c, ctx),
            }),
          );
    }
    case "observation": {
      const o = item as ObservationFormItem;
      return o.fhirId != null
        ? unwrapId(
            await updateObservationAction({
              payload: observationUpdatePayload(o),
            }),
          )
        : unwrapId(
            await createObservationAction({
              payload: observationCreatePayload(o, ctx),
            }),
          );
    }
    case "medication": {
      const m = item as MedicationFormItem;
      const prev = original as MedicationFormItem | undefined;

      if (m.fhirId != null && prev && medicationCreateOnlyFieldsChanged(prev, m)) {
        /*
         * Dose/route/frequency/duration/patient instructions/indication/note
         * live in dosage_instruction/reason_code/note — immutable child
         * arrays fhir-gql only accepts at creation. A plain update would
         * silently drop this edit (medicationUpdatePayload never sends
         * them), so the only way to make it stick is to create the
         * replacement first, then remove the superseded record.
         *
         * Create-then-delete (not the reverse) so a failure never leaves the
         * prescription missing entirely — at worst a duplicate is left
         * behind, which is recoverable from the list.
         */
        const newId = unwrapId(
          await createMedicationRequestAction({
            payload: medicationCreatePayload(m, ctx),
          }),
        );
        try {
          assertOk(
            await deleteMedicationRequestAction({ payload: { id: m.fhirId } }),
          );
        } catch (err) {
          console.error(
            "[persistClinicalEntry] failed to remove superseded medication request",
            m.fhirId,
            err,
          );
          toast.warning(
            "The updated prescription was saved, but the previous version could not be removed automatically — please delete the older duplicate from the list.",
          );
        }
        return newId;
      }

      return m.fhirId != null
        ? unwrapId(
            await updateMedicationRequestAction({
              payload: medicationUpdatePayload(m),
            }),
          )
        : unwrapId(
            await createMedicationRequestAction({
              payload: medicationCreatePayload(m, ctx),
            }),
          );
    }
    case "serviceRequest": {
      const s = item as ServiceRequestFormItem;
      return s.fhirId != null
        ? unwrapId(
            await updateServiceRequestAction({
              payload: serviceRequestUpdatePayload(s),
            }),
          )
        : unwrapId(
            await createServiceRequestAction({
              payload: serviceRequestCreatePayload(s, ctx),
            }),
          );
    }
  }
  /* Unreachable — the switch is exhaustive over ClinicalEntryKind. */
  throw new Error(`Unknown clinical entry kind: ${kind}`);
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Removes one clinical entry from FHIR.
 *
 * @param kind - Which resource the entry is.
 * @param fhirId - The resource id to delete.
 * @throws Error when the delete fails; callers surface it as a toast.
 */
export async function deleteClinicalEntry(
  kind: ClinicalEntryKind,
  fhirId: number,
): Promise<void> {
  switch (kind) {
    case "condition":
      assertOk(await deleteConditionAction({ payload: { id: fhirId } }));
      return;
    case "observation":
      assertOk(await deleteObservationAction({ payload: { id: fhirId } }));
      return;
    case "medication":
      assertOk(
        await deleteMedicationRequestAction({ payload: { id: fhirId } }),
      );
      return;
    case "serviceRequest":
      assertOk(await deleteServiceRequestAction({ payload: { id: fhirId } }));
      return;
  }
}
