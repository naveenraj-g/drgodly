/**
 * VALIDATION_SCHEMAS — registry of Zod schemas keyed by name.
 *
 * Layer: client / a2ui / schemas / validation
 *
 * A workflow action's `validation_schema` field (see WorkflowAction in
 * types/workflow.ts) is a string key into this map — /api/workflow/submit
 * looks it up here to validate + transform submitted form data before
 * calling your backend. Ships empty on purpose — this skill scaffolds the
 * *engine*, not any specific workflow's schemas.
 *
 * Add your own:
 *
 *   import { z } from "zod";
 *   import { mySchema } from "./my-resource/my_action_schema";
 *
 *   export const VALIDATION_SCHEMAS: Record<string, z.ZodType> = {
 *     my_action_schema: mySchema,
 *   };
 *
 * A missing key is not an error — submit/route.ts skips validation
 * entirely when `schema` is undefined, so an action can omit
 * validation_schema if the backend already enforces everything it needs.
 */

import type { z } from "zod";

export const VALIDATION_SCHEMAS: Record<string, z.ZodType> = {};
