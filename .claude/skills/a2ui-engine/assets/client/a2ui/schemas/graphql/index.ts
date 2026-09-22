/**
 * GRAPHQL_DOCUMENTS — registry of GraphQL query/mutation documents keyed by name.
 *
 * Layer: client / a2ui / schemas / graphql
 *
 * A workflow action or context resolver with `type: "graphql"` references a
 * document here by its `graphql_document` key — _lib.ts's
 * runGraphQLResolverOrAction() looks it up and sends it to A2UI_GRAPHQL_URL.
 * Ships empty on purpose — only wire this up if you actually use GraphQL
 * transport in a workflow; every REST-based ("http") action/resolver works
 * without it.
 *
 * Add your own:
 *
 *   import { gql } from "graphql-request";
 *
 *   export const GRAPHQL_DOCUMENTS: Record<string, string> = {
 *     create_patient: gql`
 *       mutation CreatePatient($input: PatientCreateInput!) {
 *         createPatient(input: $input) { id }
 *       }
 *     `,
 *   };
 */

export const GRAPHQL_DOCUMENTS: Record<string, string> = {};
