/**
 * Task server actions — create, list, getById, update, delete.
 *
 * Layer: presentation / actions
 * Resource: Task (FHIR R4)
 */

"use server";

import {
  CreateTaskActionSchema,
  ListTasksActionSchema,
  GetTaskByIdActionSchema,
  UpdateTaskActionSchema,
  DeleteTaskActionSchema,
  type TCreateTaskAction,
  type TListTasksAction,
  type TGetTaskByIdAction,
  type TUpdateTaskAction,
  type TDeleteTaskAction,
} from "@/modules/entities/schemas/task";
import {
  createTaskController,
  listTasksController,
  getTaskByIdController,
  updateTaskController,
  deleteTaskController,
  type TCreateTaskControllerOutput,
  type TListTasksControllerOutput,
  type TGetTaskByIdControllerOutput,
  type TUpdateTaskControllerOutput,
  type TDeleteTaskControllerOutput,
} from "@/modules/server/core/task/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";
import type { AuthResponse } from "@/modules/server/auth/types";

/** Creates a Task. */
export const createTaskAction = authenticatedProcedure
  .createServerAction()
  .input(CreateTaskActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateTaskAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TCreateTaskControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await createTaskController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Lists Tasks with optional filters. */
export const listTasksAction = authenticatedProcedure
  .createServerAction()
  .input(ListTasksActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListTasksAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TListTasksControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await listTasksController(enrichedPayload);
        return { result: data };
      });
    },
  );

/** Fetches a single Task by ID. */
export const getTaskByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetTaskByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TGetTaskByIdAction }) => {
    return await runWithTransport<TGetTaskByIdControllerOutput>(async () => {
      const data = await getTaskByIdController(input.payload);
      return { result: data };
    });
  });

/** Patches a Task by ID. */
export const updateTaskAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateTaskActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TUpdateTaskAction;
      ctx: { session: AuthResponse };
    }) => {
      return await runWithTransport<TUpdateTaskControllerOutput>(async () => {
        const enrichedPayload = {
          ...input.payload,
          org_id: ctx.session.session.activeOrganizationId ?? undefined,
        };
        const data = await updateTaskController(enrichedPayload);
        return { result: data, transport: input.transportOptions };
      });
    },
  );

/** Permanently deletes a Task. */
export const deleteTaskAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteTaskActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteTaskAction }) => {
    return await runWithTransport<TDeleteTaskControllerOutput>(async () => {
      const data = await deleteTaskController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
