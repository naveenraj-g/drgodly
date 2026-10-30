/**
 * Barrel export for all Procedure interface-adapter controllers and their output types.
 *
 * Import from this file rather than individual controller files so that the
 * server actions layer has a single, stable import path.
 */

export {
  createProcedureController,
  type TCreateProcedureControllerOutput,
} from "./createProcedure.controller";

export {
  listProceduresController,
  type TListProceduresControllerOutput,
} from "./listProcedures.controller";

export {
  getByIdProcedureController,
  type TGetByIdProcedureControllerOutput,
} from "./getByIdProcedure.controller";

export {
  updateProcedureController,
  type TUpdateProcedureControllerOutput,
} from "./updateProcedure.controller";

export {
  deleteProcedureController,
  type TDeleteProcedureControllerOutput,
} from "./deleteProcedure.controller";
