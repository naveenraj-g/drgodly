# Mobile App Guide — AI Pre-Visit Intake (Text Chat)

This is a scoped reference for the mobile app's **text-based AI intake chat** —
the free-form conversation a patient has with the intake bot before a visit,
from opening the chat to walking away with a saved, doctor-visible record.

**As of now: text only.** Voice intake is out of scope for this document —
when it's built, it reuses this exact same flow end to end; the only thing
that changes is the transport for the chat turns (a WebSocket instead of the
HTTP calls described in §2 below). Everything in §1 and §3–§5 (starting a
session, detecting completion, generating the report, saving it) carries over
unchanged. Don't build for voice yet — ask when that's ready to start.

Deliberately **out of scope** here: linking a completed intake to a booked
appointment (one call, mentioned briefly in §6 — ask if you need the full
booking flow; it's covered in `mobile-patient-api-guide.md`), and anything
doctor-side (reviewing intake reports, etc.).

---

## 0. The two systems involved — and which one you talk to for what

Unlike `mobile-patient-api-guide.md` (where every call goes straight to the
FHIR backend), intake involves **two separate backends**, and you talk to
each one directly for a different part of the flow:

| Part of the flow | Who you call | Why |
|---|---|---|
| Chatting with the AI (§2) and generating the clinical report (§4) | **The AI agent service directly** — `INTAKE_AGENT_URL` / `ASSESSMENT_PLAN_AGENT_URL` | The agent is a separate Python service, not part of this Next.js app. The web app's own chat screen talks to it through a same-origin proxy route it owns for browser/cookie reasons that don't apply to you — you skip that proxy and call the agent directly. |
| Starting, completing, and abandoning an intake **record** (§3, §5, §6.2) | **This app's own REST API** — `{APP_BASE_URL}/api/intake/*` | The conversation transcript and report are stored in this app's own database (not FHIR) — these are the endpoints built for exactly that, already used by the mobile Appointments/Patient API work. |

**Auth is the same JWT both ways.** Every call below — to the agent and to
this app's API — sends the same Better Auth-issued JWT from
`mobile-patient-api-guide.md` §1:

```
Authorization: Bearer <token>
```

The agent service verifies this token itself (against the same IAM JWKS
endpoint this app's own API routes use) — it is not a different credential
and you don't need to pre-register anything with it beyond having a valid
token. **Get the exact `INTAKE_AGENT_URL` / `ASSESSMENT_PLAN_AGENT_URL`
values for your environment from the backend team** — these are internal
service URLs, not something this guide can hardcode (they differ between
local/staging/production the same way `FHIR_GQL_URL` does). In local dev
they happen to be the same host with two different paths
(`.../api/agent/intake` and `.../api/agent/assessment`) — don't assume
that's true everywhere.

`org_id` (see `mobile-patient-api-guide.md` §2) only matters for the
`{APP_BASE_URL}/api/intake/*` calls in §3/§5/§6 below — the agent calls in
§2/§4 don't take one.

---

## 1. The flow, end to end

```
1. Patient opens the intake chat screen.
2. Loop: patient sends a message → POST to the agent → stream the reply back
   token by token. Repeat until either:
     a. the agent itself signals the conversation is over (§3.1), or
     b. the patient taps "End Chat" (§3.2).
3. Before saving anything: send the full transcript to the report agent,
   get back a clinical report (§4).
4. Create the intake record and save the transcript + report to it in one
   go, marking it COMPLETED (§5).
5. Show a completion screen. Optionally let the patient book an appointment
   from here (§6.1) — out of scope for this doc beyond the one linking call.
```

No record is created while the patient is chatting — that only happens at
the very end (§5), together with saving the transcript. This matches what
the web app's own text-intake screen does today. The trade-off: if the
patient just closes the app mid-conversation, nothing is saved — there's no
"abandoned" row to show up anywhere. If you'd rather track drop-off, see the
alternative in §5.3 — it's available, just not what the web app currently
does, so treat it as optional rather than "the same flow."

---

## 2. Chatting with the agent

```
POST {INTAKE_AGENT_URL}
Authorization: Bearer <token>
Content-Type: application/json
```

```json
// Request
{ "message": "I've had a headache for three days", "session_id": null }
```

**`session_id` is `null` on the very first message of a new conversation** —
the agent creates one and hands it back to you (see below). **From the
second message onward, send back the exact `session_id` you were given** —
this is what lets the agent remember earlier turns. Getting this wrong (e.g.
sending `null` every time, or losing the id between messages) is the single
most common way this flow silently breaks: the agent starts a brand-new,
amnesiac conversation on every turn instead of continuing the real one.

### 2.0 The opening message — prepend patient context, once

The agent has no access to this app's Patient records, so left alone it
re-asks for the patient's name/age/contact details on every single
conversation. The web app avoids that by silently prepending one context
line to the **very first message of a new session only** — same text box,
not a separate field:

```json
// Request — first message of a new conversation
{
  "message": "[Patient context: name=John Doe, age=36, email=john@example.com, phone=+1-555-0100]\n\nI've had a headache for three days",
  "session_id": null
}
```

Build that bracketed line yourself, client-side, from data you already have
(the patient's own profile — see `mobile-patient-api-guide.md` §3.1 — and
the signed-in account's display name):

```
[Patient context: name=<name>, age=<age>, email=<email>, phone=<phone>]
```

- `name` — the signed-in account's display name (not necessarily identical
  to the FHIR `Patient.name` — the web app uses the Better Auth account
  name specifically). Falls back to a literal `"Patient"` if the account
  has none, so this field is in practice always present.
- `age` — whole years computed from `Patient.birth_date`. Omit the whole
  `age=` field if `birth_date` is unknown.
- `email` / `phone` — from `Patient.telecom[]`, picking the lowest-`rank`
  entry for each `system`. Omit whichever one has no matching entry.
- Join whatever fields you have with `, `, wrap in `[Patient context: ...]`,
  then put **two newlines**, then the patient's actual typed message —
  exactly as shown above. If none of the fields are available at all, skip
  the prefix entirely and just send the patient's message as-is.
- **Only do this once, on the first message of a brand-new session**
  (`session_id: null`). Never prepend it again on later turns — the agent
  already has it from the first message, and repeating it would just be
  reinserted into the visible conversation text every turn.

### 2.1 Getting the session id

The agent hands back the session id **two different ways** — check both,
first response wins:

1. **Response header**, present on every response once a session exists:
   ```
   X-Session-Id: <session id>
   ```
2. **In the stream itself**, on the `agent_end` chunk (see §2.2) — some
   agent builds only set this, not the header. Read `data.session_id` off
   that chunk if the header wasn't present.

Store whichever you get and send it back as `session_id` on every subsequent
call in this conversation.

### 2.2 Reading the streamed response

The response body is a **stream of newline-delimited JSON objects** — read
it as it arrives (don't wait for the connection to close, or buffer the
whole thing before showing anything — the point is a token-by-token typing
effect). Each line is either plain JSON, or SSE-style prefixed with
`data: ` — strip that prefix if present before parsing. A literal
`data: [DONE]` line (no JSON) also means "stream over."

Each parsed line has a `type`, and sometimes a `data` object:

| `type` | Meaning | What to do |
|---|---|---|
| `text_delta` | One token/chunk of the reply | Append `data.content` to the message you're building up on screen |
| `text_complete` | The agent finished composing this chunk internally | No-op — purely informational, don't treat it as end-of-turn |
| `agent_end` | This turn's stream is finished | Stop reading for this turn; commit the accumulated text as the assistant's message; also check `data.session_id` (see §2.1) |
| `status_end` | **The agent itself has decided the whole conversation is over** | See §3.1 — this is the auto-completion signal |

If you see a `type` outside this list, or a non-JSON line, treat it as a
format you don't recognize and just skip it rather than crashing — the
agent's exact message shape has varied across versions, and a forward-
compatible parser is worth more here than a strict one.

---

## 3. Ending the conversation — two paths, same outcome

Both paths below end up at the same place: §4 (generate report) → §5 (save).
The only difference is what triggers it.

### 3.1 Automatic — the agent says it's done

If any chunk in a turn's stream has `type: "status_end"` (§2.2), the agent
has decided the intake is complete on its own (enough information gathered,
or the patient said something indicating they're done). Treat this exactly
as if the patient had tapped "End Chat": finish committing that turn's reply
to the screen, show a short "conversation ended" notice, then immediately
run §4 → §5. Don't wait for the patient to do anything else.

### 3.2 Manual — the patient taps "End Chat"

Always available, independent of §3.1 — the patient can cut the
conversation short at any point, even one message in. If a response is
still streaming when they tap it, cancel the in-flight request first (abort
the connection), then run §4 → §5 with whatever transcript exists so far.
If there's no conversation yet at all (zero messages sent), there's nothing
to save — just no-op.

---

## 4. Generating the clinical report

Call this once, right before saving — not during the conversation.

```
POST {ASSESSMENT_PLAN_AGENT_URL}
Authorization: Bearer <token>
Content-Type: application/json
```

```json
// Request
{
  "conversation": [
    "patient: I've had a headache for three days",
    "appointment-intake-agent: Can you describe the pain — is it constant or does it come and go?",
    "patient: It's constant, mostly on the right side"
  ]
}
```

**The exact format matters:** one string per turn, `"<speaker>: <content>"`,
where the speaker label is literally `patient` for the patient's own
messages and literally `appointment-intake-agent` for the AI's replies —
not `user`/`assistant`, not your own naming. This is the exact shape the
production web app sends and the agent expects.

```json
// Response (shape varies — treat every field as optional)
{
  "clinical_overview": "Patient reports a 3-day constant right-sided headache...",
  "risk_level": "low",
  "differential_diagnosis": ["Tension headache", "Migraine"],
  "diagnostic_plan": "No imaging indicated at this time; monitor symptoms",
  "treatment_plan": "OTC analgesics, hydration, follow up if symptoms persist beyond 7 days",
  "red_flags": []
}
```

**This call is not allowed to block saving the intake.** If it fails or
times out, still proceed to §5 without a report (send no `report` field, or
omit it) — a saved conversation with no report is far better than losing
the whole intake because the report agent hiccuped. This is exactly what
the web app does: the report step is wrapped so its failure is silent and
non-fatal.

`differential_diagnosis` and `red_flags` may come back as plain strings or
as structured objects (e.g. `{condition, rationale, likelihood}`) depending
on the agent version — don't assume one shape, and don't validate/reject
based on it. Same for `diagnostic_plan` / `treatment_plan`, which may be a
plain string or a structured object. Whatever comes back, pass it through
to §5 as-is — this app stores it unvalidated beyond "it's an object."

---

## 5. Saving the intake

Two calls, back to back, right after §4 (or immediately, if §4 failed/was
skipped).

### 5.1 Create the record

```
POST {APP_BASE_URL}/api/intake/create
Authorization: Bearer <token>
Content-Type: application/json
```

```json
// Request
{ "mode": "TEXT", "patient_fhir_id": 10001 }
```

`patient_fhir_id` is the FHIR `Patient.id` from `GET /patients/me` (see
`mobile-patient-api-guide.md` §3.1) — send it when you have it, omit it if
the patient hasn't completed their profile yet (intake doesn't require a
profile first). Don't send `userId` or `org_id` — both are stamped
server-side from your token and anything you send there is ignored.

```json
// Response — 201
{
  "id": 501,
  "user_id": "usr_123",
  "org_id": "org_1",
  "patient_fhir_id": 10001,
  "mode": "TEXT",
  "status": "IN_PROGRESS",
  "conversation": null,
  "report": null,
  "fhir_appointment_id": null,
  "created_at": "2026-10-01T09:00:00.000Z",
  "updated_at": "2026-10-01T09:00:00.000Z"
}
```

Keep `id` — it's what you pass to every other intake call below.

### 5.2 Save the transcript + report, mark complete

```
POST {APP_BASE_URL}/api/intake/update
Authorization: Bearer <token>
Content-Type: application/json
```

```json
// Request
{
  "id": 501,
  "conversation": [
    { "role": "user", "content": "I've had a headache for three days" },
    { "role": "assistant", "content": "Can you describe the pain — is it constant or does it come and go?" },
    { "role": "user", "content": "It's constant, mostly on the right side" }
  ],
  "report": {
    "clinical_overview": "Patient reports a 3-day constant right-sided headache...",
    "risk_level": "low"
  }
}
```

Note **`conversation` here uses `role: "user" | "assistant"`** — different
field names than the `patient: ` / `appointment-intake-agent: ` strings §4
wanted. Keep both representations as you go (or build one from the other at
save time); don't try to reuse the exact same array for both calls.

`report` is optional — omit it entirely if §4 failed. This call flips the
record's `status` to `COMPLETED` and is what makes the intake visible to the
doctor.

```json
// Response — 200
{ "id": 501, "status": "COMPLETED", "updated_at": "2026-10-01T09:04:00.000Z" }
```

At this point, show the patient a completion screen. The web app's version
offers "Book Appointment" (carries `intake_id` into the booking flow) and
"Maybe Later" — see §6.1 if you're wiring that up now.

### 5.3 Optional: tracking abandoned sessions

Not what the web app does today (see §1), but available if you want it:
call §5.1 **as soon as the chat screen opens** (before the first message)
instead of waiting until the end, so an `IN_PROGRESS` record exists for the
whole conversation. Then:

```
POST {APP_BASE_URL}/api/intake/abandon
Authorization: Bearer <token>
Content-Type: application/json
```

```json
// Request
{ "id": 501 }
```

Call this if the patient backgrounds/closes the app or navigates away
without reaching §5.2 for an existing `IN_PROGRESS` record. If you go this
route, §5.2 is then an *update* to the record §5.1 already created, not a
fresh create — don't call §5.1 twice for the same conversation.

---

## 6. What happens after completion

### 6.1 Linking to a booked appointment

If the patient books an appointment right after finishing intake (the
"Book Appointment" path mentioned in §5.2), call this once the booking
succeeds (see `mobile-patient-api-guide.md` §4.3 for the booking call
itself):

```
POST {APP_BASE_URL}/api/intake/link
Authorization: Bearer <token>
Content-Type: application/json
```

```json
// Request
{ "id": 501, "fhir_appointment_id": 70019 }
```

This is how the doctor's clinical-records view finds the intake report for
a given appointment. If the patient doesn't book right away, skip this —
there's no deadline on linking it later, but nothing in this guide drives
that "later" path; ask if you need it.

### 6.2 Other available endpoints (not covered in detail)

Listed for completeness — ask if you need any of these built out:

| Endpoint | Purpose |
|---|---|
| `GET {APP_BASE_URL}/api/intake/get-by-id?id={id}` | Fetch one intake record by its local id |
| `GET {APP_BASE_URL}/api/intake/list` | Paginated list of the signed-in patient's own intake history (`status`, `mode`, `limit`, `offset` query filters) |

---

## 7. Quick reference

| # | Method | Call | Target |
|---|---|---|---|
| 2 | POST | `{INTAKE_AGENT_URL}` | Agent, directly |
| 4 | POST | `{ASSESSMENT_PLAN_AGENT_URL}` | Agent, directly |
| 5.1 | POST | `/api/intake/create` | This app |
| 5.2 | POST | `/api/intake/update` | This app |
| 5.3 | POST | `/api/intake/abandon` | This app (optional path) |
| 6.1 | POST | `/api/intake/link` | This app |
| 6.2 | GET | `/api/intake/get-by-id` | This app |
| 6.2 | GET | `/api/intake/list` | This app |

Every "This app" row sends the same bearer JWT as `/api/intake/create`
above and needs no `org_id` from you — it's taken from the token. The two
agent rows need the same token but no `org_id` at all.
