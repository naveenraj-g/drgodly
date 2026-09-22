/**
 * Vitals schema barrel.
 *
 * Layer: entities / schemas / vitals
 *
 * Single import point for all Vitals schemas and types. All other modules
 * import from this barrel — never from the sub-files directly.
 *
 *  response.ts — response schema + paginated wrapper
 *  input.ts    — validation schemas + DTO types
 *  actions.ts  — ZSA action schemas (wraps input schemas with transportOptions)
 *  forms.ts    — flat React Hook Form schemas (Create + Edit)
 */

export * from "./response";
export * from "./input";
export * from "./actions";
export * from "./forms";
