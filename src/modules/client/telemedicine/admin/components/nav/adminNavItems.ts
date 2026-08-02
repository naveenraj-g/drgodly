/**
 * adminNavItems — extensible nav config for the telemedicine admin sidebar.
 *
 * Layer: client / telemedicine / admin / components / nav
 *
 * One entry per admin screen. Adding a new admin resource (HealthcareService,
 * Schedule, Slot, PractitionerRole, Practitioner — fast-follow work) is a
 * one-line addition here, no layout changes needed.
 */

import { Building2, MapPin, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  label: string;
  /** Relative to the locale root, e.g. "/telemedicine/admin/organizations". */
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Organizations",
    href: "/bezs/telemedicine/admin/organizations",
    icon: Building2,
  },
  {
    label: "Organization Hierarchy",
    href: "/bezs/telemedicine/admin/organizations/hierarchy",
    icon: Network,
  },
  {
    label: "Locations",
    href: "/bezs/telemedicine/admin/locations",
    icon: MapPin,
  },
  {
    label: "Location Hierarchy",
    href: "/bezs/telemedicine/admin/locations/hierarchy",
    icon: Network,
  },
  // Fast-follow (not yet built): HealthcareService, Schedule, Slot,
  // PractitionerRole, Practitioner — each is a one-line addition here.
];
