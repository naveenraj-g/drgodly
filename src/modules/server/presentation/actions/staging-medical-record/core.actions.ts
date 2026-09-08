/**
 * StagingMedicalRecord ZSA server actions.
 * Layer: server / presentation / actions / staging-medical-record
 * All actions require a valid session (authenticatedProcedure) — the staging
 * service itself trusts org_id/user_id as given, so the auth boundary this
 * app enforces is the only gate on who can register/review a staging record.
 */
"use server";

import {
  CreateStagingMedicalRecordActionSchema,
  ListStagingMedicalRecordsActionSchema,
  GetStagingMedicalRecordByIdActionSchema,
  UpdateStagingMedicalRecordActionSchema,
  ReviewStagingMedicalRecordActionSchema,
  DeleteStagingMedicalRecordActionSchema,
  type TCreateStagingMedicalRecordAction,
  type TListStagingMedicalRecordsAction,
  type TGetStagingMedicalRecordByIdAction,
  type TUpdateStagingMedicalRecordAction,
  type TReviewStagingMedicalRecordAction,
  type TDeleteStagingMedicalRecordAction,
} from "@/modules/entities/schemas/staging-medical-record";
import {
  createStagingMedicalRecordController,
  listStagingMedicalRecordsController,
  getStagingMedicalRecordByIdController,
  updateStagingMedicalRecordController,
  reviewStagingMedicalRecordController,
  deleteStagingMedicalRecordController,
  type TCreateStagingMedicalRecordControllerOutput,
  type TListStagingMedicalRecordsControllerOutput,
  type TGetStagingMedicalRecordByIdControllerOutput,
  type TUpdateStagingMedicalRecordControllerOutput,
  type TReviewStagingMedicalRecordControllerOutput,
} from "@/modules/server/core/staging-medical-record/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

/** Registers a source document for extraction. Status defaults to "pending" on the server. */
export const createStagingMedicalRecordAction = authenticatedProcedure
  .createServerAction()
  .input(CreateStagingMedicalRecordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateStagingMedicalRecordAction }) => {
    return await runWithTransport<TCreateStagingMedicalRecordControllerOutput>(
      async () => {
        const data = await createStagingMedicalRecordController(
          input.payload,
        );
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Lists staging records with optional filters (file_id, patient_id, status, etc.). */
export const listStagingMedicalRecordsAction = authenticatedProcedure
  .createServerAction()
  .input(ListStagingMedicalRecordsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListStagingMedicalRecordsAction }) => {
    return await runWithTransport<TListStagingMedicalRecordsControllerOutput>(
      async () => {
        const data = await listStagingMedicalRecordsController(
          input.payload,
        );
        return { result: data };
      },
    );
  });

/** Fetches a single staging record by its public id. */
export const getStagingMedicalRecordByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetStagingMedicalRecordByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetStagingMedicalRecordByIdAction }) => {
    return await runWithTransport<TGetStagingMedicalRecordByIdControllerOutput>(
      async () => {
        const data = await getStagingMedicalRecordByIdController(
          input.payload,
        );
        return { result: data };
      },
    );
  });

/** Partial update — used here to write back a doctor-edited summary before review. */
export const updateStagingMedicalRecordAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateStagingMedicalRecordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateStagingMedicalRecordAction }) => {
    return await runWithTransport<TUpdateStagingMedicalRecordControllerOutput>(
      async () => {
        const data = await updateStagingMedicalRecordController(
          input.payload,
        );
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Records a clinician's accept/reject/needs-revision decision on the extracted data. */
export const reviewStagingMedicalRecordAction = authenticatedProcedure
  .createServerAction()
  .input(ReviewStagingMedicalRecordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TReviewStagingMedicalRecordAction }) => {
    return await runWithTransport<TReviewStagingMedicalRecordControllerOutput>(
      async () => {
        const data = await reviewStagingMedicalRecordController(
          input.payload,
        );
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Permanently removes a staging record. */
export const deleteStagingMedicalRecordAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteStagingMedicalRecordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteStagingMedicalRecordAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteStagingMedicalRecordController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
