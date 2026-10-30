# Mobile App Guide — AI Pre-Visit Intake (Voice Call)

This is a scoped reference for the mobile app's **voice-based AI intake** —
the spoken conversation a patient has with the intake bot before a visit,
from tapping "Start Call" to walking away with a saved, doctor-visible
record.

**Read `mobile-text-intake-guide.md` first.** Voice intake is the same flow
end to end. The only real difference is the transport for the conversation
itself: one long-lived **WebSocket carrying raw audio both ways** instead of
one HTTP request per chat turn. Generating the report and saving the intake
(text guide §4–§6) are **identical**, except that you send `mode: "VOICE"`
instead of `"TEXT"`. This document covers the parts that are different in
full and points back to the text guide for the rest.

Deliberately **out of scope** here: the voice *AI consultation* agent (a
separate WebSocket at `/ws/consultaudio` with a similar but not identical
protocol; ask if you need it), video consultations (LiveKit), and anything
doctor-side.

> **Which web implementation is the reference?** The web app has two voice
> intake components. `VoiceIntakeTest.tsx` (custom WebSocket agent) is the
> one in production use, at `/patient/appointments/intake`. `VoiceIntake.tsx`
> is an older Vapi-based prototype that nothing routes to anymore. **Ignore
> anything Vapi-related.** Everything below describes `VoiceIntakeTest.tsx`.

---

## 0. The systems involved — and which one you talk to for what

| Part of the flow | Who you call | Why |
|---|---|---|
| The live voice conversation (§2–§4) | **The voice agent service directly**, over a WebSocket (`{INTAKE_VOICE_AGENT_WS_URL}/ws/audio`) | A separate Python service, not part of this Next.js app. |
| Generating the clinical report (§6) | **The assessment agent directly**, `ASSESSMENT_PLAN_AGENT_URL` | Same call as text guide §4. |
| Creating and completing the intake **record** (§6) | **This app's own REST API**, `{APP_BASE_URL}/api/intake/*` | Same calls as text guide §5. |

**Auth is the same Better Auth JWT you already have** (from
`mobile-patient-api-guide.md` §1, `GET {BETTER_AUTH_URL}/api/auth/token`).

### Why you skip the web app's `/api/intake-voice-agent` route

The web app calls `GET /api/intake-voice-agent` before every call. That
route does two things:

1. Mints the token by forwarding the browser's **session cookie** to
   `{BETTER_AUTH_URL}/api/auth/token`. That's the exact same exchange you
   already do yourself in `mobile-patient-api-guide.md` §1 step 2, so the
   token it returns is the same kind of Better Auth JWT you already hold.
2. Converts the server-only `INTAKE_VOICE_AGENT_URL` (an `http(s)://` base)
   into a `ws(s)://` URL with `/ws/audio` appended.

The route is **cookie-gated** and won't accept a bearer token, so mobile
can't call it. You don't need it anyway: you have the JWT, and the URL
conversion is a one-line string change (§2.1). As with the text agent, you
connect to the voice agent directly.

**Get the voice agent's base URL for each environment from the backend
team.** It differs between local, staging and production, the same way
`INTAKE_AGENT_URL` does. In local dev it's `http://localhost:8018`, the same
host as the text agents. Don't assume that holds everywhere. Ask for the
`wss://` form for staging and production; plain `ws://` should only ever be
local.

`org_id` is not sent to the voice agent at all. It only matters for the
`/api/intake/*` calls, and even there it's taken from your token (text guide
§5.1).

---

## 1. The flow, end to end

```
1. Patient opens the voice intake screen and taps "Start Call".
2. Open the WebSocket, with the JWT and patient context in the query string (§2).
3. Once the socket is open: start the microphone and stream raw 16 kHz PCM
   up the socket continuously (§3.1).
4. Meanwhile, read JSON messages coming down the socket (§4):
     - play the agent's audio,
     - show the live transcripts,
     - commit finished turns to the on-screen conversation.
5. The call ends when either:
     a. the agent signals it's done (§5.1), or
     b. the patient taps "End Call" (§5.2).
6. Stop the mic, close the socket, then (exactly as in text intake):
   generate the report → create the record with mode "VOICE" → save the
   transcript + report → completion screen (§6).
```

As in text intake, **no record is created while the call is in progress.**
It's only created at the end, together with saving the transcript. If the
call dies or the patient closes the app mid-call, nothing is saved (see
§5.4).

There is **no `session_id`** in voice intake. The WebSocket connection *is*
the session, and the agent's memory of the conversation lives exactly as
long as the socket does. A new socket means a brand-new conversation.

---

## 2. Connecting

### 2.1 Building the WebSocket URL

```
{INTAKE_VOICE_AGENT_WS_URL}/ws/audio?patient_context=<url-encoded>&token=<jwt>
```

Starting from the `http(s)://` base the backend team gives you:

- `https://` → `wss://`, `http://` → `ws://`
- strip any trailing `/`, then append `/ws/audio`
- add the query params below, **URL-encoded** (use your platform's URL or
  query builder, not string concatenation)

Example (local):

```
ws://localhost:8018/ws/audio?patient_context=%5BPatient+context%3A+name%3DJohn+Doe%2C+age%3D36%2C+email%3Djohn%40example.com%2C+phone%3D%2B1-555-0100%5D&token=eyJhbGciOiJFZERTQSIs...
```

| Query param | Required | Value |
|---|---|---|
| `token` | yes | The Better Auth JWT, the same one you send as `Authorization: Bearer` everywhere else. It goes **in the query string**, because that's where the agent reads it (browsers can't set headers on a WebSocket, so the agent was built around this). Don't rely on an `Authorization` header here even though native WebSocket clients could send one. |
| `patient_context` | no, but send it | The exact same `[Patient context: name=..., age=..., email=..., phone=...]` string described in text guide §2.0, built with the same rules. It lets the agent greet the patient by name and skip re-asking for demographics. Omit the param entirely if you'd have no fields at all. |

Two differences from text intake to note:

- In text intake, the patient context is **prepended to the first chat
  message**. In voice there's no first typed message, so it goes **on the
  connection URL** instead. It's sent once per call, at connect time.
- Mint a **fresh JWT right before each connect**. The token is short-lived
  (minutes) and is only checked when the socket opens, so get a new one for
  every "Start Call" and "Restart" instead of reusing an old one.

### 2.2 Opening the socket

- Use **binary mode** for outgoing frames (raw bytes, §3.1). Incoming
  messages are **text frames containing JSON** (§4).
- **Start the microphone only after the socket's `open` event fires.**
  That's what the web app does. Don't buffer audio from before the socket
  is open.
- Ask for mic permission at that point. If the patient denies it, close the
  socket and return to the idle "Start Call" state with an error message.
  The web app shows "Microphone access denied".

On iOS you'll need `NSMicrophoneUsageDescription`. On Android you'll need
`RECORD_AUDIO` with a runtime permission request.

---

## 3. Audio — the part with no text-intake equivalent

### 3.1 Sending: patient's microphone → agent

| Property | Value |
|---|---|
| Encoding | **16-bit signed integer PCM, little-endian** (`Int16`) |
| Sample rate | **16 000 Hz** |
| Channels | **1 (mono)** |
| Framing | Each chunk is sent as **one raw binary WebSocket frame**: just the sample bytes, with no JSON wrapper, no WAV header and no base64 |
| Cadence | Continuous for the whole call, including while the agent is talking and while the patient is silent |

How the web app produces this, if you need a reference:

- It opens a 16 kHz audio context, so the platform resamples the mic down
  to 16 kHz. **Mobile mics usually capture at 44.1 or 48 kHz, so you must
  resample to 16 kHz yourself** (or ask the OS audio API for 16 kHz mono
  directly: `AVAudioConverter` / `AVAudioEngine` on iOS, `AudioRecord` with
  `16000`, `CHANNEL_IN_MONO`, `ENCODING_PCM_16BIT` on Android).
- Float samples in `[-1, 1]` are clamped, then scaled: negative values by
  `32768`, positive values by `32767`.
- It sends one frame per audio render quantum: **128 samples (256 bytes,
  about 8 ms)** per frame. That's tiny. Mobile audio APIs naturally hand you
  bigger buffers (20–100 ms is typical). Sending those buffers as-is should
  be fine, since the agent receives a byte stream, but larger chunk sizes
  haven't been tested against this agent. **Confirm with the backend team**
  if you plan to go above about 100 ms per frame.

**Echo cancellation matters.** On the web, the mic is opened with default
browser settings, which have echo cancellation, noise suppression and auto
gain turned on. Without echo cancellation, the agent's own voice coming out
of the speaker gets picked up by the mic and sent back to it as if the
patient had said it. Use the platform's voice-processing mode:
`AVAudioSession` category `.playAndRecord` with mode `.voiceChat` on iOS, or
`MediaRecorder.AudioSource.VOICE_COMMUNICATION` (plus `AcousticEchoCanceler`
if available) on Android.

### 3.2 Receiving: agent's voice → speaker

Agent speech arrives as JSON messages (§4) of type `audio`:

```json
{ "type": "audio", "audio": "<base64>" }
```

| Property | Value |
|---|---|
| Encoding | base64 of **16-bit signed PCM, little-endian** |
| Sample rate | **24 000 Hz** (note: different from the 16 kHz you send) |
| Channels | 1 (mono) |
| WAV header | **Sometimes present, sometimes not, even in the middle of a stream.** If the decoded bytes start with `RIFF` (the base64 string starts with `UklGR`), drop the first **44 bytes** before treating the rest as samples. |

Skip `audio` messages whose `audio` field is empty or only whitespace.

**Play the chunks back to back, without gaps or overlaps.** The web app
uses a simple scheduler. It keeps a "next start time" cursor. Each chunk
starts at `max(cursor, now)`, and the cursor then advances by that chunk's
duration (`samples / 24000` seconds). On mobile, the equivalent is to
enqueue each decoded buffer onto one continuous player, e.g. an
`AVAudioPlayerNode` with `scheduleBuffer` on iOS, or an `AudioTrack` in
streaming mode at 24 kHz written sequentially on Android. Don't create a new
player per chunk; that produces audible clicks and gaps.

**Interruptions:** the web app does **not** stop or flush queued agent
audio when the patient starts talking over it. Whatever was queued keeps
playing. Matching that behaviour is the safe default. Ask the backend team
before adding barge-in, since the agent doesn't send an explicit "stop
playback" message.

---

## 4. Messages from the agent

Every incoming text frame is one JSON object with a `type`. The payload
field is `text` for the text-bearing types. That differs from the text
agent's `data.content`, so don't share a parser between the two.

| `type` | Example | What to do |
|---|---|---|
| `status` | `{"type":"status","status":"greeting"}` | Agent's current phase. Drives the status label (see §4.2). `status: "end"` means the conversation is over (§5.1). |
| `status_end` | `{"type":"status_end"}` | Also means the conversation is over (§5.1). The agent may use either form, so handle both. |
| `transcript` | `{"type":"transcript","text":"I've had a head"}` | The patient's speech as recognised so far. **It grows over time and each message contains the full text so far, so replace, don't append.** Show it as a live, not-yet-committed "you" bubble. See §4.1 for when to commit it. |
| `text` | `{"type":"text","text":"How long"}` | One incremental piece of the agent's spoken reply. **Append** it to a live agent bubble. |
| `text_delta` | `{"type":"text_delta","text":" have you"}` | Same as `text`: some agent builds send this name instead. Treat the two identically. |
| `assistant_text` | `{"type":"assistant_text","text":"How long have you had this headache?"}` | One **complete, final** agent turn. Commit it as an agent message, and **discard** whatever you'd accumulated from `text`/`text_delta` for this turn (this replaces it rather than adding to it). |
| `audio` | `{"type":"audio","audio":"<base64>"}` | Agent speech to play (§3.2). |
| `error` | `{"type":"error","message":"..."}` | Show `message` (fall back to "Unknown error from agent."). This **doesn't** end the call by itself. |

If you get an unknown `type`, an unknown `status` value, or a frame that
isn't valid JSON, **log it and ignore it.** Don't crash. The agent's message
set has changed across versions, so a lenient parser is safer than a strict
one.

### 4.1 Turning the stream into a conversation (turn-commit rules)

The agent doesn't send an explicit "turn finished" marker for either side.
The web app infers turn boundaries like this, and you should do the same so
the saved transcript matches what the web saves:

Keep two pending buffers, `pendingUser` and `pendingAgent`, plus the list
of committed messages.

| When you receive | Do this, in order |
|---|---|
| `transcript` | 1. If `pendingAgent` is non-empty, commit it as an **agent** message and clear it.<br>2. Set `pendingUser = text` (replace). Show it live. |
| `text` / `text_delta` | 1. If `pendingUser` is non-empty, commit it as a **patient** message and clear it.<br>2. `pendingAgent += text`. Show it live. |
| `assistant_text` | 1. If `pendingUser` is non-empty, commit it as a **patient** message and clear it.<br>2. Clear `pendingAgent`, then commit `text` as an **agent** message. |
| call ending (§5) | Commit `pendingUser` (if non-empty) **then** `pendingAgent` (if non-empty), in that order, before saving. |

Notes:

- Trim whitespace before committing, and never commit an empty string.
- The patient's turn appears in the conversation only once the agent starts
  replying. Until then it stays as the live "you" bubble.
- If the patient speaks in two bursts before the agent replies, the second
  `transcript` replaces the first in `pendingUser`. Only the latest text
  gets committed. That's the web's current behaviour and it's intentional:
  the agent's transcripts are cumulative for the turn.

### 4.2 Status label (UI only)

The web app keeps the connection state (`disconnected` / `connecting` /
`connected`) separate from the agent's phase, and derives one label:

| State | Label | Dot |
|---|---|---|
| not connected | Offline | grey |
| socket opening | Connecting... | amber, pulsing |
| `status: "greeting"` | Speaking greeting... | amber, pulsing |
| `status: "thinking"` | Thinking... | amber, pulsing |
| receiving `text` / `text_delta` | Speaking... | amber, pulsing |
| `status: "ready"`, or right after an agent turn is committed | Ready — you can speak | green |
| connected, no status yet | Online | green |

Expect the sequence `greeting` → `ready` at the start of every call. The
agent speaks its opening line first, so the patient doesn't need to say
anything to get things going.

---

## 5. Ending the call

### 5.1 Automatic — the agent says it's done

Either `{"type":"status","status":"end"}` or `{"type":"status_end"}` means
the agent has decided the intake is complete. When you get one:

1. Flush the pending buffers (§4.1, last row).
2. Optionally show a UI-only notice. The web app adds a "The conversation
   has ended." bubble. **This notice must not go into the saved
   transcript**, so keep it out of the list you send in §6.
3. Run the normal end-call sequence (§5.2 onwards) without waiting for the
   patient.

Guard against running the end sequence twice. The agent may send an end
signal and then close the socket, and the patient may tap "End Call" at the
same moment.

### 5.2 Manual — the patient taps "End Call"

Always available while connected. The sequence (identical for 5.1) is:

1. Flush pending buffers (§4.1).
2. Tear everything down: stop the mic and release the audio session, stop
   and discard queued playback, close the socket.
3. If there are **zero committed messages**, there's nothing to save. Show
   "No conversation to save yet." and return to idle.
4. Otherwise go to §6.

### 5.3 Mute and Restart (in-call controls)

The web app shows two more buttons next to "End Call" while connected:

- **Mute / Unmute**: disable the mic input but **keep sending frames** (in
  other words, send silence). Don't stop streaming or close anything. The
  web app does this by disabling the audio track, which makes the pipeline
  emit zero-valued samples. On mobile, send zero-filled buffers of the same
  size, or the platform's input-mute equivalent, as long as frames keep
  flowing.
- **Restart**: tear down (§5.2 step 2), **throw away the whole transcript
  without saving anything**, then immediately reconnect from §2 with a fresh
  token. The agent starts a brand-new conversation, with a new greeting.

Both are disabled while the end sequence (§6) is running.

### 5.4 Unexpected disconnects

If the socket closes on its own (network drop, server restart), the web app
just goes back to "Offline". The conversation stays on screen, but the
patient can only start a new call, and doing so **clears it without saving.**
There's no reconnect-and-resume, because the agent's memory went away with
the socket (§1).

Mobile networks drop far more often than desktop browsers do, so we
**recommend** (this isn't web parity) treating an unexpected close with at
least one committed message as an automatic "End Call" (§5.2), so the
conversation is still saved and gets a report. If there are no committed
messages, go back to idle. Either way, tear down the mic and playback. Ask
if you'd rather keep strict parity with the web.

Also handle the app going to the background mid-call. At minimum, stop
capturing. iOS will suspend you unless you've declared the `audio`
background mode, and we haven't decided whether the call should keep
running in the background. Treating backgrounding as "End Call" is a
reasonable default.

---

## 6. Report + save — same as text intake

Run these in order, exactly as in `mobile-text-intake-guide.md`:

1. **Generate the report** (text guide §4): `POST {ASSESSMENT_PLAN_AGENT_URL}`
   with the committed messages flattened to
   `"patient: ..."` / `"appointment-intake-agent: ..."` strings. **Non-fatal**:
   if it fails, carry on without a report.
2. **Create the record** (text guide §5.1): `POST {APP_BASE_URL}/api/intake/create`,
   but with **`"mode": "VOICE"`**:
   ```json
   { "mode": "VOICE", "patient_fhir_id": 10001 }
   ```
3. **Save transcript + report** (text guide §5.2): `POST {APP_BASE_URL}/api/intake/update`
   with `conversation` as `{ role: "user" | "assistant", content }` objects
   (patient → `user`, agent → `assistant`) and the optional `report`. This
   flips the record to `COMPLETED` and makes it visible to the doctor.
4. **Completion screen**, with optional booking + `POST /api/intake/link`
   (text guide §6.1).

Recognised speech is saved **as text only.** No audio is uploaded or stored
anywhere by this flow.

The web app shows "Generating..." while step 1 runs and "Saving..." during
steps 2–3, with all call controls disabled.

---

## 7. Quick reference

| # | What | Target |
|---|---|---|
| 2 | `WS {INTAKE_VOICE_AGENT_WS_URL}/ws/audio?patient_context=…&token=…` | Voice agent, directly |
| 3.1 | ↑ binary frames: PCM-16 LE, 16 kHz, mono | Voice agent |
| 3.2 / 4 | ↓ JSON text frames: `status`, `status_end`, `transcript`, `text`, `text_delta`, `assistant_text`, `audio` (PCM-16 LE, 24 kHz, base64), `error` | From voice agent |
| 6.1 | `POST {ASSESSMENT_PLAN_AGENT_URL}` | Agent, directly |
| 6.2 | `POST /api/intake/create` with `mode: "VOICE"` | This app |
| 6.3 | `POST /api/intake/update` | This app |
| 6.4 | `POST /api/intake/link` (optional) | This app |

**Open questions to confirm with the backend team before building:**

1. The `wss://` base URL for the voice agent in staging and production.
2. Whether outgoing audio frames larger than about 100 ms are fine (§3.1).
3. Whether the agent supports barge-in, i.e. the patient interrupting the
   agent mid-sentence (§3.2).
