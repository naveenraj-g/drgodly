# Test data seeder

Populates realistic, multi-disease outpatient records (Appointment → Encounter →
Conditions / Observations / MedicationRequests / ServiceRequests /
DiagnosticReports) for a given patient/practitioner pair, so the doctor and
patient UIs have something real to test against instead of empty states.

## Why a standalone script

The app's own `create*Action`s (`src/modules/server/presentation/actions/*`)
mint their auth JWT from the *current Next.js request's* cookies
(`src/modules/server/auth/jwt-token.ts`), so they can't be called from a bare
script. This script does the same login → JWT chain itself and then talks
straight to the FHIR/GQL core over REST — the exact endpoints and payload
shapes the app's own `*RestApiService` classes use
(`src/modules/server/core/*/infrastructure/services`), just from Node instead
of from inside a request. It needs neither the Next dev server nor any new
backend/admin route.

## Prerequisites

- A test doctor account that exists in the target IAM (Better Auth), with a
  linked Practitioner FHIR profile.
- The FHIR patient_id / practitioner_id you want to seed data against — this
  script never provisions IAM users or Patient/Practitioner FHIR records
  itself, only the clinical resources under them.
- `env/local.env` and/or `env/hosted.env`, copied from the `.example` files in
  the same folder and filled in. These are gitignored — never commit real
  credentials.

## Usage

```bash
# Validate every fixture against the real schemas — no network calls.
pnpm seed:test-data -- --scenario diabetes-followup --dry-run

# Seed one scenario against local dev.
pnpm seed:test-data -- --scenario diabetes-followup --patient-id 10042 --practitioner-id 30007

# Seed every scenario for the same patient (multiple appointments/visits).
pnpm seed:test-data -- --all --patient-id 10042 --practitioner-id 30007

# Point at the hosted deployment instead of local dev.
pnpm seed:test-data -- --scenario migraine --env hosted --patient-id 501 --practitioner-id 12
```

Flags:

| Flag | Required | Notes |
| --- | --- | --- |
| `--scenario <id>` | one of `--scenario`/`--all` | Repeatable — pass multiple times to run several scenarios in one call. |
| `--all` | — | Runs every `scenarios/*.json` file. |
| `--patient-id <n>` | no | Falls back to `SEED_DEFAULT_PATIENT_ID` in the env file. |
| `--practitioner-id <n>` | no | Falls back to `SEED_DEFAULT_PRACTITIONER_ID`. |
| `--env <name>` | no (default `local`) | Selects `env/<name>.env`. |
| `--dry-run` | no | Validates all selected fixtures against the real Zod schemas; makes no network calls. |

Each run appends a summary (appointment/encounter ids + resource counts per
scenario) to `last-run.json` in this folder (gitignored) — useful for finding
what to open in the UI, or for manual cleanup later.

## Scenario fixture format

Each `scenarios/*.json` file uses the **exact flat field names** from the
app's real create schemas (`src/modules/entities/schemas/{condition,
observation,medication-request,service-request,diagnostic-report,encounter,
appointment}/input.ts`) — there's no translation layer, and every fixture is
Zod-validated against those same schemas (`scenarios/schema.ts`) before
anything is sent.

Cross-resource references use `{{TOKEN}}` placeholders resolved at seed time:

| Token | Resolves to |
| --- | --- |
| `{{PATIENT_REF}}` | `Patient/<--patient-id>` |
| `{{PRACTITIONER_REF}}` | `Practitioner/<--practitioner-id>` |
| `{{APPOINTMENT_REF}}` | `Appointment/<id>` of the appointment this scenario just created |
| `{{ENCOUNTER_ID}}` | numeric id of the encounter this scenario just created |
| `{{SERVICE_REQUEST_REF:<name>}}` | `ServiceRequest/<id>` of the service request named `<name>` elsewhere in the same scenario |
| `{{NOW}}` | current timestamp, ISO 8601 |
| `{{DAYS_AGO:<n>}}` / `{{DAYS_AGO:<n>:<HH>:<MM>}}` | timestamp `n` days before now, optionally at a specific time of day |

Each resource entry (condition/observation/medicationRequest/serviceRequest/
diagnosticReport) is `{ "name": "...", "create": { ...real payload... } }`.
`name` is fixture-only bookkeeping, stripped before the POST — it's what lets
another entry in the same scenario reference this one (see
`{{SERVICE_REQUEST_REF:...}}` above, and `resultFrom` below).

A `diagnosticReport` entry may also carry `"resultFrom": ["obs-name", ...]` —
names of `observations[]` entries in the same scenario. The create schema has
no `result` field (it's PATCH-only, meant to grow after creation), so the
script creates the DiagnosticReport first and then issues one PATCH with
`result: [...]` pointing at the named observations' ids.

## Scenarios

| id | Disease | Resources touched | Notable UI state |
| --- | --- | --- | --- |
| `diabetes-followup` | Type 2 diabetes | Condition, 2 Observations, MedicationRequest, ServiceRequest, DiagnosticReport | Full order→result loop |
| `hypertension-followup` | Essential hypertension | Condition, multi-component BP Observation, MedicationRequest | No orders |
| `acute-uri` | Acute upper respiratory infection | Condition, 2 Observations, MedicationRequest | Leanest visit — no orders, no labs |
| `strep-pharyngitis` | Streptococcal pharyngitis | Condition, 2 Observations, MedicationRequest, ServiceRequest, DiagnosticReport | Full order→result loop, positive culture |
| `migraine` | Migraine | Condition, Observation, MedicationRequest | No orders — pain/neuro flavor |
| `asthma-exacerbation` | Mild persistent asthma | Condition, 2 Observations, MedicationRequest, ServiceRequest | Order left **pending** — no DiagnosticReport yet |
| `urinary-tract-infection` | UTI | Condition, 2 Observations, MedicationRequest, ServiceRequest, DiagnosticReport | Full order→result loop, 2 linked results |
| `iron-deficiency-anemia` | Iron-deficiency anemia | Condition, 3 Observations, MedicationRequest, ServiceRequest, DiagnosticReport | Richest result set — 3 linked observations |

Diagnosis/observation/order codes are ICD-10-CM (Condition), LOINC
(Observation/ServiceRequest/DiagnosticReport), and RxNorm (MedicationRequest) —
representative, real-world codes, cross-checked loosely against Synthea's
public disease modules (github.com/synthetichealth/synthea) for plausibility.
Spot-check against an official terminology browser before relying on exact
code values for anything beyond UI testing.

## Adding a new scenario

Copy the smallest existing fixture that's closest in shape (`migraine.json` for
a no-orders visit, `urinary-tract-infection.json` for an order→result visit),
rename `meta.id`/`meta.title`, and change the clinical content. Validate with
`--dry-run` before seeding it for real.
