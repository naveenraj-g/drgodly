"server-only";

import {
  InputParseError,
  OutputParseError,
} from "@/modules/server/shared/errors/schemaParseError";
import { ZSAError } from "zsa";
import { ApplicationError } from "../applicationError";

function isNextJsControlError(error: any) {
  return (
    error?.message === "NEXT_REDIRECT" || error?.message === "NEXT_NOT_FOUND"
  );
}

export function mapErrorToZSA(error: unknown): never {
  // Next.js redirect()/notFound() throw special control errors that must not be transformed.
  if (isNextJsControlError(error)) {
    throw error;
  }

  if (error instanceof InputParseError) {
    throw new ZSAError("INPUT_PARSE_ERROR", {
      inputParseErrors: {
        fieldErrors: error.fieldErrors,
        formErrors: error.formErrors,
        formattedErrors: error.formattedErrors,
      },
    });
  }

  if (error instanceof OutputParseError) {
    throw new ZSAError(
      "OUTPUT_PARSE_ERROR",
      "Something went wrong. Please try again later."
    );
  }

  if (error instanceof ApplicationError) {
    if (!error.isOperational) {
      console.error(error);
    }
    throw new ZSAError("ERROR", error.message);
  }

  if (error instanceof Error) {
    throw new ZSAError("ERROR", error.message);
  }

  throw new ZSAError("INTERNAL_SERVER_ERROR", "Something went wrong");
}
