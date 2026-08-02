/**
 * adminNavItems — extensible nav config for the telemedicine admin sidebar.
 *
 * Layer: client / telemedicine / admin / components / nav
 *
 * One entry per admin screen. Adding a new admin resource (HealthcareService,
 * Schedule, Slot, PractitionerRole, Practitioner — fast-follow work) is a
 * one-line addition here, no layout changes needed.
 */

import { Building2, CalendarClock, Clock, MapPin, Network, Stethoscope } from "lucide-react";
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
  {
    label: "Healthcare Services",
    href: "/bezs/telemedicine/admin/healthcare-services",
    icon: Stethoscope,
  },
  {
    label: "Schedules",
    href: "/bezs/telemedicine/admin/schedules",
    icon: CalendarClock,
  },
  {
    label: "Slots",
    href: "/bezs/telemedicine/admin/slots",
    icon: Clock,
  },
  // Fast-follow (not yet built): PractitionerRole, Practitioner — each is a
  // one-line addition here.
];
