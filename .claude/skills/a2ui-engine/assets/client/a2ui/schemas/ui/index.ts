/**
 * UI_SCHEMA_REGISTRY — registry of A2UI UI-schema trees keyed by name.
 *
 * Layer: client / a2ui / schemas / ui
 *
 * A workflow step's `ui.schema` field is a string key into this map — the
 * chat container looks up the matching tree and hands it to the renderer.
 * Ships empty on purpose — this skill scaffolds the *engine*, not any
 * specific screen's layout.
 *
 * Add your own:
 *
 *   import myFormSchema from "./my_form.json";
 *
 *   export const UI_SCHEMA_REGISTRY: Record<string, unknown> = {
 *     my_form: myFormSchema,
 *   };
 *
 * See references/authoring-ui-schemas.md for the node-tree shape (every
 * type in the catalog, its `properties`, and the `$transform` data-pipeline
 * syntax for driving charts/tables/metrics off resolved context data).
 */

export const UI_SCHEMA_REGISTRY: Record<string, unknown> = {};
