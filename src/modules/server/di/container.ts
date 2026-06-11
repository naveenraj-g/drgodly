import { createContainer } from "@evyweb/ioctopus";
import { DI_RETURN_TYPES, DI_SYMBOLS } from "./types";
import {
  registerOrganizationModule,
  registerPatientModule,
  registerTerminologyModule,
  registerEmrChatModule,
} from "./modules";

const ApplicationContainer = createContainer();

registerPatientModule(ApplicationContainer);
registerOrganizationModule(ApplicationContainer);
registerTerminologyModule(ApplicationContainer);
registerEmrChatModule(ApplicationContainer);

export const getInjection = <K extends keyof typeof DI_SYMBOLS>(
  symbol: K
): DI_RETURN_TYPES[K] => {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
};
