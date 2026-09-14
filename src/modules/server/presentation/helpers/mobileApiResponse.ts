/**
 * Shared error → HTTP response mapping for the mobile-facing REST API.
 *
 * Layer: presentation / helpers
 *
 * The mobile API routes under /api/{intake,consultation,ai-consultation}/*
 * call the same controllers the ZSA server actions already use, so they can
 * surface the same two error families those controllers/use-cases throw:
 *   - BaseParseError (InputParseError) — Zod validation failure in a controller.
 *   - ApplicationError subclasses (NotFoundError, ConflictError, etc.) — thrown
 *     by use-cases/repositories, already carrying the right HTTP status code.
 * verifyBearerToken also throws UnauthorizedError (an ApplicationError), so
 * auth failures fall through the same ApplicationError branch below.
 */

import { NextResponse } from "next/server";
import { BaseParseError } from "@/modules/server/shared/errors/schemaParseError";
import { ApplicationError } from "@/modules/server/shared/errors/applicationError";

/**
 * Converts a caught error from a mobile API route handler into the
 * appropriate NextResponse, logging anything unexpected.
 *
 * @param err - The error caught in the route's try/catch.
 * @param routeTag - Short tag (e.g. "[intake/create]") prefixed on server logs.
 */
export function mobileErrorResponse(
  err: unknown,
  routeTag: string,
): NextResponse {
  // req.json() throws a plain SyntaxError on empty/malformed bodies — that's
  // a client mistake, not a server fault, so it belongs in the 400 branch
  // rather than falling through to the generic 500 below.
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (err instanceof BaseParseError) {
    return NextResponse.json(
      {
        error: err.message,
        fieldErrors: err.fieldErrors,
        formErrors: err.formErrors,
      },
      { status: 400 },
    );
  }

  if (err instanceof ApplicationError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.statusCode },
    );
  }

  console.error(`${routeTag} unexpected error:`, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
