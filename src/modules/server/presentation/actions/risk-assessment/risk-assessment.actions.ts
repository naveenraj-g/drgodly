/**
 * RiskAssessment server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: RiskAssessment (FHIR R4)
 */

"use server";

import {
  CreateRiskAssessmentActionSchema,
  ListRiskAssessmentsActionSchema,
  GetRiskAssessmentByIdActionSchema,
  UpdateRiskAssessmentActionSchema,
  DeleteRiskAssessmentActionSchema,
  type TCreateRiskAssessmentAction,
  type TListRiskAssessmentsAction,
  type TGetRiskAssessmentByIdAction,
  type TUpdateRiskAssessmentAction,
  type TDeleteRiskAssessmentAction,
} from "@/modules/entities/schemas/risk-assessment";
import {
  createRiskAssessmentController,
  listRiskAssessmentsController,
  getRiskAssessmentByIdController,
  updateRiskAssessmentController,
  deleteRiskAssessmentController,
  type TCreateRiskAssessmentControllerOutput,
  type TListRiskAssessmentsControllerOutput,
  type TGetRiskAssessmentByIdControllerOutput,
  type TUpdateRiskAssessmentControllerOutput,
} from "@/modules/server/core/risk-assessment/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a RiskAssessment. */
export const createRiskAssessmentAction = authenticatedProcedure
  .createServerAction()
  .input(CreateRiskAssessmentActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateRiskAssessmentAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateRiskAssessmentControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await createRiskAssessmentController(enrichedPayload);
          return { result: data, transport: input.transportOptions };
        },
      );
    },
  );

/** Lists RiskAssessments with optional filters. */
export const listRiskAssessmentsAction = authenticatedProcedure
  .createServerAction()
  .input(ListRiskAssessmentsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListRiskAssessmentsAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListRiskAssessmentsControllerOutput>(
        async () => {
          const enrichedPayload = {
            ...input.payload,
            org_id: ctx.session.session.activeOrganizationId ?? undefined,
          };
          const data = await listRiskAssessmentsController(enrichedPayload);
          return { result: data };
        },
      );
    },
  );

/** Fetches a single RiskAssessment by numeric ID. */
export const getRiskAssessmentByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetRiskAssessmentByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetRiskAssessmentByIdAction }) => {
    return await runWithTransport<TGetRiskAssessmentByIdControllerOutput>(
      async () => {
        const data = await getRiskAssessmentByIdController(input.payload);
        return { result: data };
      },
    );
  });

/** Partially updates a RiskAssessment by ID. */
export const updateRiskAssessmentAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateRiskAssessmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateRiskAssessmentAction }) => {
    return await runWithTransport<TUpdateRiskAssessmentControllerOutput>(
      async () => {
        const data = await updateRiskAssessmentController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

/** Permanently deletes a RiskAssessment by ID. */
export const deleteRiskAssessmentAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteRiskAssessmentActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteRiskAssessmentAction }) => {
    return await runWithTransport<void>(async () => {
      await deleteRiskAssessmentController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
