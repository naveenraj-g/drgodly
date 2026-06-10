"use server";

import {
  DeletePatientActionSchema,
  GetPatientByIdActionSchema,
  GetPatientSummaryActionSchema,
  ListPatientsActionSchema,
  RegisterPatientActionSchema,
  UpdatePatientActionSchema,
} from "@/modules/entities/schemas/patient/patient.schema";
import {
  deletePatientController,
  getPatientByIdController,
  getPatientMeController,
  getPatientSummaryController,
  listPatientsController,
  registerPatientController,
  updatePatientController,
  type TDeletePatientControllerOutput,
  type TGetPatientByIdControllerOutput,
  type TGetPatientMeControllerOutput,
  type TGetPatientSummaryControllerOutput,
  type TListPatientsControllerOutput,
  type TRegisterPatientControllerOutput,
  type TUpdatePatientControllerOutput,
} from "@/modules/server/core/patient/interface-adapters/controllers";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { authenticatedProcedure } from "../procedures";

export const registerPatientAction = authenticatedProcedure
  .createServerAction()
  .input(RegisterPatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TRegisterPatientControllerOutput>(async () => {
      const data = await registerPatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const listPatientsAction = authenticatedProcedure
  .createServerAction()
  .input(ListPatientsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TListPatientsControllerOutput>(async () => {
      const data = await listPatientsController(input.payload);
      return { result: data };
    });
  });

export const getPatientMeAction = authenticatedProcedure
  .createServerAction()
  .handler(async () => {
    return await runWithTransport<TGetPatientMeControllerOutput>(async () => {
      const data = await getPatientMeController();
      return { result: data };
    });
  });

export const getPatientByIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetPatientByIdActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TGetPatientByIdControllerOutput>(async () => {
      const data = await getPatientByIdController(input.payload);
      return { result: data };
    });
  });

export const getPatientSummaryAction = authenticatedProcedure
  .createServerAction()
  .input(GetPatientSummaryActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TGetPatientSummaryControllerOutput>(
      async () => {
        const data = await getPatientSummaryController(input.payload);
        return { result: data };
      }
    );
  });

export const updatePatientAction = authenticatedProcedure
  .createServerAction()
  .input(UpdatePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdatePatientControllerOutput>(async () => {
      const data = await updatePatientController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deletePatientAction = authenticatedProcedure
  .createServerAction()
  .input(DeletePatientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeletePatientControllerOutput>(async () => {
      await deletePatientController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
