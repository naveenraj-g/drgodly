/**
 * GET /api/mobile/openapi.json — OpenAPI 3.1 spec for the mobile REST API.
 *
 * Layer: app / api / mobile
 *
 * Generates the document from mobile-api.registry.ts (which reuses the same
 * Zod schemas the routes themselves validate against, so this can never
 * drift from what a route actually accepts) via OpenApiGeneratorV31.
 * Consumed by src/app/docs/mobile-api/route.ts (Scalar UI) and by any
 * OpenAPI-aware client-generation tool.
 */

import { NextResponse } from "next/server";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { mobileApiRegistry } from "@/modules/server/presentation/openapi/mobile-api.registry";

/**
 * Builds and returns the OpenAPI document.
 *
 * @returns The OpenAPI 3.1 spec as JSON.
 */
export async function GET() {
  const generator = new OpenApiGeneratorV31(mobileApiRegistry.definitions);

  const document = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Drgodly Mobile API",
      version: "1.0.0",
      description:
        "REST endpoints for the mobile app covering Intake, Consultation, and AI " +
        "Consultation — local Postgres-backed application data that sits alongside " +
        "the FHIR/GraphQL clinical resources. Every endpoint requires a bearer JWT " +
        "(see the bearerAuth security scheme); the existing web app's server actions " +
        "are separate and unaffected.",
    },
    servers: [{ url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000" }],
  });

  return NextResponse.json(document);
}
