/**
 * Barrel export for all Vitals interface-adapter controllers and their output types.
 *
 * Import from this file rather than individual controller files so that the
 * server actions layer has a single, stable import path.
 */

export {
  createVitalsController,
  type TCreateVitalsControllerOutput,
} from "./createVitals.controller";

export {
  listVitalsController,
  type TListVitalsControllerOutput,
} from "./listVitals.controller";

export {
  getVitalsByIdController,
  type TGetVitalsByIdControllerOutput,
} from "./getVitalsById.controller";

export {
  updateVitalsController,
  type TUpdateVitalsControllerOutput,
} from "./updateVitals.controller";

export {
  deleteVitalsController,
  type TDeleteVitalsControllerOutput,
} from "./deleteVitals.controller";
