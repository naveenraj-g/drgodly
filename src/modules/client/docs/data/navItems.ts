/**
 * navItems.ts — static top-level navigation for /docs/mobile-guide.
 *
 * Layer: client / docs / data
 *
 * The FHIR and AI Agents groups additionally get their sub-items generated
 * at render time from FHIR_RESOURCES / AGENTS (see DocsNav.tsx) so the nav
 * can never drift out of sync with the data those pages are built from.
 */

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Get started",
    links: [
      { href: "/docs/mobile-guide", label: "Overview" },
      { href: "/docs/mobile-guide/auth", label: "Authentication" },
    ],
  },
  {
    title: "Build a flow",
    links: [
      { href: "/docs/mobile-guide/patient-journey", label: "Patient journey" },
      { href: "/docs/mobile-guide/doctor-journey", label: "Doctor journey" },
    ],
  },
  {
    title: "API reference",
    links: [
      { href: "/docs/mobile-guide/mobile-api", label: "Mobile API (Intake/Consultation)" },
      { href: "/docs/mobile-guide/fhir", label: "FHIR resources" },
      { href: "/docs/mobile-guide/fhir-staging", label: "FHIR staging (review workflow)" },
      { href: "/docs/mobile-guide/agents", label: "AI agents" },
      { href: "/docs/mobile-guide/voice-consultation", label: "Voice & video consultation" },
      { href: "/docs/mobile-guide/attachments", label: "File attachments" },
    ],
  },
];
