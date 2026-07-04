# FHIR Appointment Booking Flow

Full flow covering Organization, Location, HealthcareService, PractitionerRole, Practitioner,
Schedule (multi-actor), Slot (pre-generated), and Appointment.

---

## Core Concept: Slots are pre-created, not at booking time

`PractitionerRole.availableTime` is a **rule/template** — it says
*"this practitioner is generally available Mon–Fri 09:00–17:00."*
It is **not** a bookable slot.

The admin (or an automated system job) reads that rule and generates individual Slots in advance
when the Schedule is set up for a planning period. Those Slots (09:00–09:30, 09:30–10:00 …)
sit with `status = free`. At booking time the patient picks one — nothing new is created except
the Appointment itself.

---

## Resource Chain

```
Organization
    └── Location
            └── HealthcareService  (what service is offered here)
                    └── PractitionerRole  ──→  Practitioner
                              availableTime = general rule (Mon-Fri 09:00-17:00)
                                    └── Schedule
                                          actor[]: PractitionerRole, Location, ...
                                          planningHorizon: e.g. July 2026
                                                └── Slot  (pre-generated 30-min blocks)
                                                      status: free → busy on booking
                                                            └── Appointment
```

---

## Phase 1 — Setup (Admin)

### 1. Organization
The hospital or clinic entity.

### 2. Location
Physical place.
- `managingOrganization` → Organization
- `partOf` → parent Location (e.g. ward inside hospital)

### 3. HealthcareService
Defines what service is offered at a Location by an Organization.

| Field | Purpose |
|---|---|
| `providedBy` | → Organization |
| `location[]` | → Location(s) where the service runs |
| `specialty` | Clinical specialty (e.g. Cardiology) |
| `serviceType` | Type of care (Consultation, Emergency, Checkup) |
| `availableTime` | General hours the *service* is open (separate from practitioner) |

### 4. Practitioner
The clinician's global record — name, qualification, identifier.
Has no org context on its own.
One Practitioner can work at multiple organizations via multiple PractitionerRoles.

### 5. PractitionerRole
Binds the Practitioner to an Organization + Location + HealthcareService.

| Field | Purpose |
|---|---|
| `practitioner` | → Practitioner |
| `organization` | → Organization |
| `location[]` | → Location(s) |
| `healthcareService[]` | → HealthcareService(s) |
| `specialty` | Clinical specialty |
| `availableTime` | **Input rule used to generate Slots** — e.g. Mon–Fri 09:00–17:00 |
| `notAvailable` | Exceptions — holidays, leave |

> `availableTime` is NOT a bookable slot. It is the template read by the slot-generation step.

### 6. Schedule
A container for availability over a planning period.

| Field | Purpose |
|---|---|
| `actor[]` | **Multiple actors supported**: PractitionerRole, Practitioner, Location, Device, HealthcareService, Patient, RelatedPerson |
| `serviceType` | What appointment types this schedule accepts |
| `specialty` | Clinical specialty |
| `planningHorizon` | Date range this schedule covers (e.g. 2026-07-01 to 2026-07-31) |

Example actors on one schedule: `[PractitionerRole/dr-cardio, Location/room-3]`
meaning "Dr. Cardio is available in Room 3 during this period."

### 7. Slots — pre-generated from the Schedule

The system reads `PractitionerRole.availableTime` + a chosen slot duration (e.g. 30 min)
and generates all individual Slots for the planning horizon upfront:

```
09:00 – 09:30  →  Slot  status: free
09:30 – 10:00  →  Slot  status: free
10:00 – 10:30  →  Slot  status: free
...
16:30 – 17:00  →  Slot  status: free
```

Each Slot:

| Field | Purpose |
|---|---|
| `schedule` | → parent Schedule |
| `start` / `end` | Exact time window |
| `status` | `free` \| `busy` \| `busy-unavailable` \| `busy-tentative` |
| `serviceType` | What appointment type this slot accepts (filters booking) |

These Slots are in the DB waiting to be claimed. **No Slot is created at booking time.**

---

## Phase 2 — Booking (Patient)

### Step 1 — Select service entry point
Patient selects: Organization → Location → HealthcareService (or specialty).

### Step 2 — Find PractitionerRoles
Query PractitionerRoles filtered by `organization` + `location` + `healthcareService`.
Returns all practitioners who offer that service at that location.

### Step 3 — Find Schedules
Query Schedules where `actor` includes those PractitionerRoles.

### Step 4 — Find free Slots
Query Slots on those Schedules with `status = free`.
Optionally filter by `serviceType` if the patient selected an appointment mode
(e.g. only show slots that accept CHECKUP).

### Step 5 — Patient picks a Slot
Patient sees a calendar of free windows and picks one (e.g. 09:00–09:30 on 10 July).

**The Practitioner is derived at this point — never directly searched:**
```
Slot → Schedule.actor → PractitionerRole.practitioner → Practitioner
```

### Step 6 — Create Appointment

```json
{
  "resourceType": "Appointment",
  "status": "pending",
  "appointmentType": {
    "coding": [{ "code": "CHECKUP", "display": "Regular checkup" }]
  },
  "serviceType": [
    { "coding": [{ "code": "consultation", "display": "Consultation" }] }
  ],
  "slot": [{ "reference": "Slot/abc-0900" }],
  "participant": [
    { "actor": { "reference": "Patient/p1" },            "status": "accepted"     },
    { "actor": { "reference": "Practitioner/dr1" },      "status": "needs-action" },
    { "actor": { "reference": "Location/loc1" },         "status": "accepted"     },
    { "actor": { "reference": "HealthcareService/hs1" }, "status": "accepted"     }
  ]
}
```

### Step 7 — Update Slot status
Slot status flips: `free → busy`. No other patient can book it.

---

## Appointment Mode (`appointmentType`)

Set on the **Appointment** resource. Slots can pre-declare `serviceType` to restrict
which modes they accept (e.g. a slot tagged `emergency` only accepts emergency bookings).

| Code | Meaning |
|---|---|
| `ROUTINE` | Routine appointment |
| `WALKIN` | Walk-in, no prior booking |
| `CHECKUP` | Regular checkup |
| `FOLLOWUP` | Follow-up visit |
| `EMERGENCY` | Emergency |

Source: `http://terminology.hl7.org/CodeSystem/v2-0276`

---

## Slot Generation vs PractitionerRole.availableTime

| | PractitionerRole.availableTime | Slot |
|---|---|---|
| **What it is** | General availability rule | Individual bookable time block |
| **When set** | When PractitionerRole is created | Generated from Schedule for a planning period |
| **Granularity** | Day + hour range (Mon–Fri 09:00–17:00) | Exact start/end (09:00–09:30) |
| **Used for** | Input to slot generation, display of working hours | Actual booking target |
| **Status** | No status | free / busy / busy-unavailable |

---

## Full Resource Reference Map

| Resource | Key References |
|---|---|
| Location | `managingOrganization` → Organization |
| HealthcareService | `providedBy` → Organization, `location[]` → Location |
| PractitionerRole | `practitioner` → Practitioner, `organization` → Organization, `location[]` → Location, `healthcareService[]` → HealthcareService |
| Schedule | `actor[]` → PractitionerRole / Location / Device / HealthcareService / Practitioner |
| Slot | `schedule` → Schedule |
| Appointment | `slot[]` → Slot, `participant[].actor` → Patient / Practitioner / Location / HealthcareService |
