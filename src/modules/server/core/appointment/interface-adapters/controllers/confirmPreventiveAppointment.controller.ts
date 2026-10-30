/**
 * confirmPreventiveAppointmentController — validates input and invokes the use case.
 *
 * Layer: server / core / appointment / interface-adapters / controllers
 */

import { ConfirmPreventiveAppointmentValidationSchema } from "@/modules/entities/schemas/appointment";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  confirmPreventiveAppointmentUseCase,
  type IConfirmPreventiveAppointmentResult,
} from "../../application/usecases/confirmPreventiveAppointment.usecase";

function presenter(data: IConfirmPreventiveAppointmentResult) {
  return data;
}

export type TConfirmPreventiveAppointmentControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates `{ appointment_id, plan_definition_id, org_id }` and runs the confirm flow.
 *
 * @param input - Raw value from the server action.
 * @returns Fulfilled appointment, encounter id and $apply outcome.
 * @throws InputParseError | NotFoundError | ValidationError | ConflictError | UnauthorizedError
 */
export async function confirmPreventiveAppointmentController(
  input: unknown,
): Promise<TConfirmPreventiveAppointmentControllerOutput> {
  const parsed = await ConfirmPreventiveAppointmentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await confirmPreventiveAppointmentUseCase(parsed.data));
}
