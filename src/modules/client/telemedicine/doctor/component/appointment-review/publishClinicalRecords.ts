/**
 * publishClinicalRecords — pushes staged clinical form state into the EMR (FHIR).
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * This is the "accept" half of the staging→accept→EMR model. Doctor edits live
 * in local form state (and, on the Clinical Records workspace, in the
 * Consultation staging row); calling this writes them to fhir-gql for real.
 *
 * Diff strategy — each item is partitioned against the fhirIds that were present
 * when the form was loaded:
 *   - fhirId present in the current list        → UPDATE (doctor edited it)
 *   - fhirId absent from the current list       → CREATE (newly added item)
 *   - fhirId loaded at mount but missing now    → DELETE (doctor removed it)
 *
 * Every resource type's delete/update/create calls run together in one
 * Promise.all, and all four resource types run concurrently too — a publish is
 * one round of parallel writes, not a sequential cascade.
 *
 * CREATEs also report back a { localId -> new fhirId } map (createdIds) so the
 * caller can stamp fhirId onto its own form state without a refetch — needed so
 * a doctor-added item is recognised as "now in the EMR" immediately after this
 * resolves, rather than only after the page reloads.
 *
 * Immutability caveat (enforced by fhir-gql, mirrored here): child arrays such
 * as category, note, reference_range and dosage_instruction can only be set at
 * CREATE time. UPDATE payloads therefore carry scalar fields only — changing a
 * child array requires the doctor to delete and re-add the item.
 *
 * Shared by AppointmentReview (post-consultation review) and the Clinical
 * Records workspace so both publish through exactly one implementation.
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
import {
  conditionCreatePayload,
  conditionUpdatePayload,
  medicationCreatePayload,
  medicationUpdatePayload,
  observationCreatePayload,
  observationUpdatePayload,
  serviceRequestCreatePayload,
  serviceRequestUpdatePayload,
  type ClinicalWriteContext,
} from "./clinicalPayloads";
import type {
  ConditionFormItem,
  MedicationFormItem,
  ObservationFormItem,
  ServiceRequestFormItem,
} from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The set of FHIR IDs present per resource type when the form was loaded.
 * Anything in here but absent from the current lists is treated as a deletion.
 */
export interface InitialFhirIds {
  conditions: Set<number>;
  observations: Set<number>;
  medications: Set<number>;
  serviceRequests: Set<number>;
}

/** Everything publishClinicalRecords needs to diff and write one encounter's records. */
export interface PublishClinicalRecordsInput {
  /** Current condition form state. */
  conditions: ConditionFormItem[];
  /** Current observation form state. */
  observations: ObservationFormItem[];
  /** Current medication request form state. */
  medications: MedicationFormItem[];
  /** Current service request form state. */
  serviceRequests: ServiceRequestFormItem[];
  /** FHIR IDs present at load — used to compute deletions. */
  initialFhirIds: InitialFhirIds;
  /** FHIR subject reference for created resources, e.g. "Patient/10001". */
  subject: string;
  /** FHIR Encounter.id that every created resource is linked to. */
  encounterId: number;
}

/** Maps a form item's local `id` to the fhirId a CREATE call for it returned. */
export type CreatedIdMap = Map<string, number>;

/** Everything publishClinicalRecords hands back once every write has settled. */
export interface PublishClinicalRecordsResult {
  /** The FHIR IDs still present after publishing — reset the load-time snapshot to this. */
  initialFhirIds: InitialFhirIds;
  /** New fhirIds assigned to items that were CREATEd this round, keyed by local id. */
  createdIds: {
    conditions: CreatedIdMap;
    observations: CreatedIdMap;
    medications: CreatedIdMap;
    serviceRequests: CreatedIdMap;
  };
}

// ── Per-resource helper ───────────────────────────────────────────────────────

/**
 * Runs one resource type's delete/update/create calls in parallel and reports
 * back which local ids got a new fhirId from a CREATE.
 *
 * @param items - Current form items for this resource type.
 * @param deletedFhirIds - fhirIds present at load but no longer in `items`.
 * @param buildUpdatePayload - Maps an existing item to its UPDATE payload.
 * @param buildCreatePayload - Maps a new item to its CREATE payload.
 * @param remove - Delete action for one fhirId.
 * @param update - Update action for one item.
 * @param create - Create action for one item; response must carry `id`.
 * @returns Map of local `id` -> new fhirId for every item that was CREATEd.
 */
async function publishResource<TItem extends { id: string; fhirId?: number }>(
  items: TItem[],
  deletedFhirIds: number[],
  buildUpdatePayload: (item: TItem) => unknown,
  buildCreatePayload: (item: TItem) => unknown,
  remove: (payload: { id: number }) => Promise<unknown>,
  update: (payload: unknown) => Promise<unknown>,
  create: (payload: unknown) => Promise<[{ id: number } | null, unknown]>,
): Promise<CreatedIdMap> {
  const [, , createResults] = await Promise.all([
    Promise.all(deletedFhirIds.map((id) => remove({ id }))),
    Promise.all(
      items.filter((item) => item.fhirId).map((item) => update(buildUpdatePayload(item))),
    ),
    Promise.all(
      items
        .filter((item) => !item.fhirId)
        .map(async (item) => {
          const [data] = await create(buildCreatePayload(item));
          return [item.id, data?.id] as const;
        }),
    ),
  ]);

  const createdIds: CreatedIdMap = new Map();
  for (const [localId, fhirId] of createResults) {
    if (fhirId != null) createdIds.set(localId, fhirId);
  }
  return createdIds;
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * Diffs the supplied form state against the FHIR IDs loaded at mount and applies
 * CREATE / UPDATE / DELETE operations in parallel across all four resource types.
 *
 * @param input - Current form state, load-time FHIR IDs, subject and encounter.
 * @returns The FHIR IDs still present after publishing (reset the load-time
 *          snapshot to this) plus a map of newly-CREATEd local ids -> fhirId.
 * @throws Whatever the underlying server actions throw if a write fails — the
 *         caller is responsible for surfacing the error to the doctor.
 */
export async function publishClinicalRecords({
  conditions,
  observations,
  medications,
  serviceRequests,
  initialFhirIds,
  subject,
  encounterId,
}: PublishClinicalRecordsInput): Promise<PublishClinicalRecordsResult> {
  /* ── Compute deletes: IDs loaded at mount that are no longer in the list ── */
  const currentConditionFhirIds = new Set(
    conditions.filter((c) => c.fhirId).map((c) => c.fhirId!),
  );
  const currentObservationFhirIds = new Set(
    observations.filter((o) => o.fhirId).map((o) => o.fhirId!),
  );
  const currentMedicationFhirIds = new Set(
    medications.filter((m) => m.fhirId).map((m) => m.fhirId!),
  );
  const currentServiceRequestFhirIds = new Set(
    serviceRequests.filter((s) => s.fhirId).map((s) => s.fhirId!),
  );

  const deletedConditionIds = [...initialFhirIds.conditions].filter(
    (id) => !currentConditionFhirIds.has(id),
  );
  const deletedObservationIds = [...initialFhirIds.observations].filter(
    (id) => !currentObservationFhirIds.has(id),
  );
  const deletedMedicationIds = [...initialFhirIds.medications].filter(
    (id) => !currentMedicationFhirIds.has(id),
  );
  const deletedServiceRequestIds = [...initialFhirIds.serviceRequests].filter(
    (id) => !currentServiceRequestFhirIds.has(id),
  );

  /* Subject + encounter every CREATE attaches to. */
  const ctx: ClinicalWriteContext = { subject, encounterId };

  const [conditionCreatedIds, observationCreatedIds, medicationCreatedIds, serviceRequestCreatedIds] =
    await Promise.all([
      publishResource(
        conditions,
        deletedConditionIds,
        conditionUpdatePayload,
        (c) => conditionCreatePayload(c, ctx),
        (p) => deleteConditionAction({ payload: p }),
        (p) => updateConditionAction({ payload: p as ReturnType<typeof conditionUpdatePayload> }),
        (p) => createConditionAction({ payload: p as ReturnType<typeof conditionCreatePayload> }),
      ),
      publishResource(
        observations,
        deletedObservationIds,
        observationUpdatePayload,
        (o) => observationCreatePayload(o, ctx),
        (p) => deleteObservationAction({ payload: p }),
        (p) => updateObservationAction({ payload: p as ReturnType<typeof observationUpdatePayload> }),
        (p) => createObservationAction({ payload: p as ReturnType<typeof observationCreatePayload> }),
      ),
      publishResource(
        medications,
        deletedMedicationIds,
        medicationUpdatePayload,
        (m) => medicationCreatePayload(m, ctx),
        (p) => deleteMedicationRequestAction({ payload: p }),
        (p) => updateMedicationRequestAction({ payload: p as ReturnType<typeof medicationUpdatePayload> }),
        (p) => createMedicationRequestAction({ payload: p as ReturnType<typeof medicationCreatePayload> }),
      ),
      publishResource(
        serviceRequests,
        deletedServiceRequestIds,
        serviceRequestUpdatePayload,
        (s) => serviceRequestCreatePayload(s, ctx),
        (p) => deleteServiceRequestAction({ payload: p }),
        (p) => updateServiceRequestAction({ payload: p as ReturnType<typeof serviceRequestUpdatePayload> }),
        (p) => createServiceRequestAction({ payload: p as ReturnType<typeof serviceRequestCreatePayload> }),
      ),
    ]);

  return {
    initialFhirIds: {
      conditions: currentConditionFhirIds,
      observations: currentObservationFhirIds,
      medications: currentMedicationFhirIds,
      serviceRequests: currentServiceRequestFhirIds,
    },
    createdIds: {
      conditions: conditionCreatedIds,
      observations: observationCreatedIds,
      medications: medicationCreatedIds,
      serviceRequests: serviceRequestCreatedIds,
    },
  };
}
