/**
 * GET /api/mobile/docs — interactive documentation for the mobile REST API.
 *
 * Layer: app / api / mobile
 *
 * Renders the spec from /api/mobile/openapi.json via Scalar's API Reference
 * (the FastAPI-/docs-equivalent for this app's mobile endpoints). Lives under
 * /api rather than a page route because next-intl's locale middleware
 * (src/proxy.ts) redirects every path to a locale-prefixed one except
 * `/api`, `/trpc`, `/_next`, `/_vercel` — this is developer reference, not
 * part of the patient/doctor portal, so it needs neither a locale prefix nor
 * an auth guard, and living under /api sidesteps that middleware entirely
 * instead of changing its matcher.
 *
 * A route handler rather than a page.tsx: @scalar/nextjs-api-reference's
 * ApiReference() returns a plain Response-producing handler, not a React
 * component.
 */

import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  url: "/api/mobile/openapi.json",
  pageTitle: "Drgodly Mobile API Reference",
});
