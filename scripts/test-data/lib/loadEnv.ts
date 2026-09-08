/**
 * Loads a named environment profile (local | hosted | ...) for the seed script.
 *
 * Profiles live at scripts/test-data/env/<name>.env (gitignored — copy from the
 * committed <name>.env.example and fill in real values) so pointing the script at
 * the hosted app instead of local dev is just `--env hosted`, never a code change.
 */

import path from "node:path";
import dotenv from "dotenv";

export interface SeedEnvConfig {
  betterAuthUrl: string;
  fhirGqlUrl: string;
  email: string;
  password: string;
  defaultPatientId?: number;
  defaultPractitionerId?: number;
}

const REQUIRED_KEYS = [
  "BETTER_AUTH_URL",
  "FHIR_GQL_URL",
  "SEED_DOCTOR_EMAIL",
  "SEED_DOCTOR_PASSWORD",
] as const;

export function loadEnvConfig(envName: string): SeedEnvConfig {
  const envPath = path.resolve(__dirname, "..", "env", `${envName}.env`);
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    throw new Error(
      `Could not load ${envPath}.\n` +
        `Copy scripts/test-data/env/${envName}.env.example to ${envName}.env and fill in real values.`,
    );
  }

  const env = result.parsed ?? {};
  const missing = REQUIRED_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Missing required keys in ${envPath}: ${missing.join(", ")}`);
  }

  return {
    betterAuthUrl: env.BETTER_AUTH_URL,
    fhirGqlUrl: env.FHIR_GQL_URL,
    email: env.SEED_DOCTOR_EMAIL,
    password: env.SEED_DOCTOR_PASSWORD,
    defaultPatientId: env.SEED_DEFAULT_PATIENT_ID
      ? Number(env.SEED_DEFAULT_PATIENT_ID)
      : undefined,
    defaultPractitionerId: env.SEED_DEFAULT_PRACTITIONER_ID
      ? Number(env.SEED_DEFAULT_PRACTITIONER_ID)
      : undefined,
  };
}
