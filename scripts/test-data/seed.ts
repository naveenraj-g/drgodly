/**
 * Seeds realistic, multi-disease outpatient test data into the FHIR/GQL core for
 * a given (patient, practitioner) pair, over the same REST contracts the app's
 * own create*Action → *RestApiService chain uses (see README.md for why this
 * script talks to the backend directly instead of importing those actions).
 *
 * Usage:
 *   tsx scripts/test-data/seed.ts --scenario diabetes-followup --patient-id 10042 --practitioner-id 30007
 *   tsx scripts/test-data/seed.ts --all --patient-id 10042 --practitioner-id 30007 --env hosted
 *   tsx scripts/test-data/seed.ts --scenario migraine --dry-run
 *
 * See README.md for the full flag reference and the scenario list.
 */

import fs from "node:fs";
import path from "node:path";
import type { AxiosInstance } from "axios";
import { loadEnvConfig } from "./lib/loadEnv";
import { getJwt } from "./lib/auth";
import { createFhirClient, createResource, patchResource, type ResourceKind } from "./lib/client";
import { resolvePlaceholders, type PlaceholderContext } from "./lib/resolvePlaceholders";
import { ScenarioSchema, type TScenario } from "./scenarios/schema";

const SCENARIOS_DIR = path.resolve(__dirname, "scenarios");
const FAKE_ID = 999999; // stand-in for not-yet-created ids during the pre-flight/--dry-run parse

interface Args {
  scenarioIds: string[];
  patientId?: number;
  practitionerId?: number;
  env: string;
  dryRun: boolean;
}

function listScenarioIds(): string[] {
  return fs
    .readdirSync(SCENARIOS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

function parseArgs(argv: string[]): Args {
  const args: Args = { scenarioIds: [], env: "local", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--scenario":
        args.scenarioIds.push(argv[++i]);
        break;
      case "--all":
        args.scenarioIds = listScenarioIds();
        break;
      case "--patient-id":
        args.patientId = Number(argv[++i]);
        break;
      case "--practitioner-id":
        args.practitionerId = Number(argv[++i]);
        break;
      case "--env":
        args.env = argv[++i];
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}. See README.md for the flag reference.`);
    }
  }
  if (args.scenarioIds.length === 0) {
    throw new Error(
      `Pass --scenario <id> (repeatable) or --all. Known ids: ${listScenarioIds().join(", ")}`,
    );
  }
  return args;
}

function loadRawScenario(id: string): unknown {
  const file = path.join(SCENARIOS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No scenario file for "${id}" (expected ${file}). Known ids: ${listScenarioIds().join(", ")}`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

/** Every `SERVICE_REQUEST_REF:<name>` a scenario's `based_on` fields might reference,
 *  bound to a fake ref, so the pre-flight parse can resolve them before anything
 *  has actually been created yet. */
function scanServiceRequestNames(raw: unknown): string[] {
  const names = (raw as { serviceRequests?: { name?: unknown }[] })?.serviceRequests ?? [];
  return names.map((s) => s.name).filter((n): n is string => typeof n === "string");
}

function buildFakeContext(raw: unknown, baseContext: PlaceholderContext): PlaceholderContext {
  const ctx: PlaceholderContext = {
    ...baseContext,
    APPOINTMENT_REF: `Appointment/${FAKE_ID}`,
    ENCOUNTER_ID: FAKE_ID,
  };
  for (const name of scanServiceRequestNames(raw)) {
    ctx[`SERVICE_REQUEST_REF:${name}`] = `ServiceRequest/${FAKE_ID}`;
  }
  return ctx;
}

/** Validates a whole scenario against the real schemas via a throwaway fake
 *  context — the actual pre-flight/`--dry-run` gate: every field name/shape gets
 *  checked before any network call is made. */
function validateScenario(raw: unknown, baseContext: PlaceholderContext): TScenario {
  const fakeContext = buildFakeContext(raw, baseContext);
  const resolved = resolvePlaceholders(raw, fakeContext);
  return ScenarioSchema.parse(resolved);
}

interface RunResult {
  scenarioId: string;
  title: string;
  appointmentId?: number;
  encounterId?: number;
  counts: Record<"conditions" | "observations" | "medicationRequests" | "serviceRequests" | "diagnosticReports", number>;
}

async function createOne(
  client: AxiosInstance | null,
  kind: ResourceKind,
  raw: unknown,
  context: PlaceholderContext,
  dryRun: boolean,
): Promise<{ id: number }> {
  const resolved = resolvePlaceholders(raw, context);
  if (dryRun) return { id: FAKE_ID };
  return createResource(client!, kind, resolved) as Promise<{ id: number }>;
}

async function runScenario(
  raw: TScenario,
  scenarioId: string,
  baseContext: PlaceholderContext,
  client: AxiosInstance | null,
  dryRun: boolean,
): Promise<RunResult> {
  const context: PlaceholderContext = { ...baseContext };
  const counts = {
    conditions: 0,
    observations: 0,
    medicationRequests: 0,
    serviceRequests: 0,
    diagnosticReports: 0,
  };

  const appt = await createOne(client, "appointment", raw.appointment, context, dryRun);
  context.APPOINTMENT_REF = `Appointment/${appt.id}`;

  const enc = await createOne(client, "encounter", raw.encounter, context, dryRun);
  context.ENCOUNTER_ID = enc.id;

  for (const c of raw.conditions) {
    await createOne(client, "condition", c.create, context, dryRun);
    counts.conditions++;
  }

  const obsIdByName: Record<string, number> = {};
  for (const o of raw.observations) {
    const created = await createOne(client, "observation", o.create, context, dryRun);
    obsIdByName[o.name] = created.id;
    counts.observations++;
  }

  for (const m of raw.medicationRequests) {
    await createOne(client, "medicationRequest", m.create, context, dryRun);
    counts.medicationRequests++;
  }

  for (const s of raw.serviceRequests) {
    const created = await createOne(client, "serviceRequest", s.create, context, dryRun);
    context[`SERVICE_REQUEST_REF:${s.name}`] = `ServiceRequest/${created.id}`;
    counts.serviceRequests++;
  }

  for (const d of raw.diagnosticReports) {
    const created = await createOne(client, "diagnosticReport", d.create, context, dryRun);
    counts.diagnosticReports++;
    if (d.resultFrom?.length && !dryRun) {
      const result = d.resultFrom.map((name) => {
        const obsId = obsIdByName[name];
        if (obsId === undefined) {
          throw new Error(
            `diagnosticReport "${d.name}" resultFrom references unknown observation "${name}"`,
          );
        }
        return { reference: `Observation/${obsId}` };
      });
      await patchResource(client!, "diagnosticReport", created.id, { result });
    }
  }

  return {
    scenarioId,
    title: raw.meta.title,
    appointmentId: dryRun ? undefined : appt.id,
    encounterId: dryRun ? undefined : enc.id,
    counts,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // --dry-run never touches the network, so it never needs an env file — only
  // load one if it's actually there, purely to pick up default ids if present.
  let env: ReturnType<typeof loadEnvConfig> | undefined;
  if (args.dryRun) {
    try {
      env = loadEnvConfig(args.env);
    } catch {
      env = undefined;
    }
  } else {
    env = loadEnvConfig(args.env);
  }

  const patientId = args.patientId ?? env?.defaultPatientId ?? (args.dryRun ? FAKE_ID : undefined);
  const practitionerId =
    args.practitionerId ?? env?.defaultPractitionerId ?? (args.dryRun ? FAKE_ID : undefined);
  if (!patientId || !practitionerId) {
    throw new Error(
      "No patient/practitioner id. Pass --patient-id/--practitioner-id, or set " +
        "SEED_DEFAULT_PATIENT_ID/SEED_DEFAULT_PRACTITIONER_ID in your env file.",
    );
  }

  const baseContext: PlaceholderContext = {
    PATIENT_REF: `Patient/${patientId}`,
    PRACTITIONER_REF: `Practitioner/${practitionerId}`,
  };

  let client: AxiosInstance | null = null;
  if (args.dryRun) {
    console.log("Dry run — validating fixtures against the real schemas, no network calls.\n");
  } else {
    const liveEnv = env!;
    console.log(`Authenticating against ${liveEnv.betterAuthUrl} as ${liveEnv.email} ...`);
    const jwt = await getJwt({
      betterAuthUrl: liveEnv.betterAuthUrl,
      email: liveEnv.email,
      password: liveEnv.password,
    });
    client = createFhirClient(liveEnv.fhirGqlUrl, jwt);
    console.log(
      `Authenticated. Seeding against ${liveEnv.fhirGqlUrl} (patient=${patientId}, practitioner=${practitionerId}).\n`,
    );
  }

  const results: RunResult[] = [];
  for (const scenarioId of args.scenarioIds) {
    const raw = loadRawScenario(scenarioId);
    const scenario = validateScenario(raw, baseContext);

    console.log(`=== ${scenario.meta.title} (${scenarioId}) ===`);
    const result = await runScenario(scenario, scenarioId, baseContext, client, args.dryRun);
    results.push(result);
    const countsStr = Object.entries(result.counts)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(
      `  appointment=${result.appointmentId ?? "(dry-run)"} encounter=${result.encounterId ?? "(dry-run)"} ${countsStr}\n`,
    );
  }

  if (args.dryRun) {
    console.log(`Dry run OK — ${results.length} scenario(s) validated against the real schemas.`);
  } else {
    const summaryPath = path.resolve(__dirname, "last-run.json");
    fs.writeFileSync(
      summaryPath,
      JSON.stringify({ env: args.env, patientId, practitionerId, results }, null, 2),
    );
    console.log(`Summary written to ${summaryPath}`);
  }
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
