/**
 * @file mockOcData.ts
 * @description Static mock data for the /doctor/oc-demo prototype page — a
 * visual reference for a redesigned online-consultation screen. Every value
 * here is hand-authored to match the reference design; the only real piece
 * of this page is the video tile itself (see VideoConsultPanel.tsx), which
 * is a genuine LiveKit room, not mocked.
 * @layer client/telemedicine/doctor/component/oc-demo
 */

// ── Patient identity ──────────────────────────────────────────────────────────

export const MOCK_PATIENT = {
  name: "Louise Reed",
  gender: "Female",
  age: 30,
  patientCode: "DG100328",
  badges: ["Established Patient", "Hypertension", "Migraine"],
  visitType: "Video Consultation",
  visitDate: "Apr 24, 2025",
  visitTime: "10:00 AM (30 min)",
};

export const MOCK_DOCTOR = {
  name: "Dr. Arjun Mehta",
  speciality: "Internal Medicine",
};

// ── AI Pre-Visit Summary ──────────────────────────────────────────────────────

export const MOCK_AI_SUMMARY = {
  generatedLabel: "Generated 2 mins ago",
  text: "30-year-old female with intermittent dizziness and headaches for 2 days, worse on standing, associated with mild nausea. No fever or vomiting. Similar episode 6 months ago. Known hypertension, on amlodipine.",
};

// ── Key vitals ────────────────────────────────────────────────────────────────

export const MOCK_VITALS = {
  reportedAt: "Today, 9:45 AM",
  items: [
    { label: "BP", value: "118/76", unit: "mmHg" },
    { label: "HR", value: "72", unit: "bpm" },
    { label: "Temp", value: "98.1°F", unit: "(36.7°C)" },
    { label: "SpO₂", value: "99%", unit: "" },
  ],
};

// ── Medications / allergies / history ────────────────────────────────────────

export const MOCK_MEDICATIONS = ["Amlodipine 5 mg OD", "Sumatriptan 50 mg PRN"];

export const MOCK_ALLERGIES = "No known drug allergies";

export const MOCK_HISTORY = [
  "Hypertension (2022)",
  "Migraine (since 2019)",
  "No diabetes",
  "Non-smoker",
];

// ── Recent labs & reports ─────────────────────────────────────────────────────

export const MOCK_LABS = [
  { name: "CBC", date: "Jan 12, 2025", status: "Normal" },
  { name: "Thyroid Function", date: "Jan 12, 2025", status: "Normal" },
  { name: "MRI Brain", date: "Mar 3, 2024", status: "No acute abnormality" },
];

// ── Live transcript (mock messages) ──────────────────────────────────────────

export interface MockTranscriptMessage {
  speaker: "doctor" | "patient";
  name: string;
  time: string;
  text: string;
}

export const MOCK_TRANSCRIPT: MockTranscriptMessage[] = [
  {
    speaker: "doctor",
    name: "Doctor",
    time: "10:02 AM",
    text: "Can you describe your dizziness in more detail? Does it happen when you stand up or all the time?",
  },
  {
    speaker: "patient",
    name: "Patient",
    time: "10:03 AM",
    text: "It mostly happens when I stand up, and sometimes when I turn my head quickly. It's a spinning sensation.",
  },
  {
    speaker: "doctor",
    name: "Doctor",
    time: "10:03 AM",
    text: "Do you also have any nausea or vomiting?",
  },
  {
    speaker: "patient",
    name: "Patient",
    time: "10:04 AM",
    text: "I feel a little nauseous, but no vomiting.",
  },
];

export const MOCK_QUICK_PROMPTS = [
  "Ask about red flags",
  "Summarize symptoms",
  "Check orthostatic vitals",
  "Patient education",
];

// ── Clinical Decision Support ─────────────────────────────────────────────────

export const MOCK_RISK_LABEL = "Low – Moderate Risk";

export const MOCK_LIKELY_CAUSES = [
  { rank: 1, name: "Orthostatic hypotension", percent: 45 },
  { rank: 2, name: "Vestibular migraine", percent: 30 },
  { rank: 3, name: "Benign paroxysmal positional vertigo (BPPV)", percent: 15 },
  { rank: 4, name: "Tension-type headache", percent: 7 },
  { rank: 5, name: "Other (e.g., anemia, arrhythmia)", percent: 3 },
];

export const MOCK_NEXT_STEPS = [
  { label: "Check orthostatic vitals (BP, HR supine and standing)", checked: true },
  { label: "Consider CBC, electrolytes if persistent symptoms", checked: false },
  { label: "Assess for red flags (neurological deficits, severe headache, syncope)", checked: false },
  { label: "Consider vestibular function test if recurrent", checked: false },
  { label: "Follow up in 2 weeks or earlier if worsening", checked: false },
];

export const MOCK_RED_FLAGS = [
  "Severe headache (thunderclap)",
  "Focal neurological deficit",
  "Persistent vomiting",
  "Syncope",
  "New vision changes",
];

export const MOCK_GUIDELINES = [
  "ACC – Headache Guidelines (2022)",
  "AHA – Orthostatic Hypotension",
  "AAO – Vertigo Evaluation",
  "Choosing Wisely – Neuroimaging",
];
