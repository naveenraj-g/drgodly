/**
 * @file AppointmentDemo.tsx
 * @description Visual-redesign prototype of "My Appointments" — a design
 * reference for a restyled appointments screen, kept on its own route
 * (/doctor/appointment-demo) so it stays isolated from the real Appointments
 * page (DoctorAppointmentsTable) while still being wired to real data and
 * real server-side pagination/filtering. Each tab (Today/Upcoming/Past/
 * Cancelled) is its own AppointmentDemoTabPanel — a self-contained
 * useServerDataTable + useQuery instance, exactly like DoctorAppointmentsTable
 * — so pagination, sorting, and every filter are resolved server-side via
 * listAppointmentsAction, never client-side. This component only owns the
 * cross-tab bits: the tab-strip counts, the "Today" stat cards/donut summary,
 * and the mini calendar.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDisplayDateLong } from "@/modules/shared/helper";
import {
  CalendarIcon,
  CalendarClock,
  ChevronRight,
  FileText,
  Stethoscope,
  UserPlus,
  Users,
  Video,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { AppointmentDemoTabPanel } from "./AppointmentDemoTabPanel";
import { TodaysOverviewDonut } from "./TodaysOverviewDonut";
import { DemoCalendarPanel } from "./DemoCalendarPanel";
import type { AppointmentDemoColumnCallbacks } from "./AppointmentDemoColumns";
import {
  appointmentDemoKeys,
  fetchDemoCalendarMonth,
  fetchDemoTabCount,
  fetchDemoTodaySummary,
  type DemoTab,
  type DemoTabPageResult,
} from "./demoQueries";
import { doctorStore } from "@/modules/client/telemedicine/doctor/stores/doctor.store";

// ── Tab config ────────────────────────────────────────────────────────────────

interface TabConfig {
  value: DemoTab;
  label: string;
  emptyMessage: string;
  enableStatusFilter: boolean;
  enableDateFilter: boolean;
}

const TABS: TabConfig[] = [
  {
    value: "today",
    label: "Today",
    emptyMessage: "No appointments scheduled for today.",
    enableStatusFilter: true,
    enableDateFilter: false,
  },
  {
    value: "upcoming",
    label: "Upcoming",
    emptyMessage: "No upcoming appointments.",
    enableStatusFilter: false,
    enableDateFilter: true,
  },
  {
    value: "past",
    label: "Past",
    emptyMessage: "No past appointments found.",
    enableStatusFilter: true,
    enableDateFilter: true,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    emptyMessage: "No cancelled appointments.",
    enableStatusFilter: false,
    enableDateFilter: true,
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AppointmentDemoProps {
  /** SSR-fetched first page of the "Today" tab — seeds its useQuery. */
  initialToday: DemoTabPageResult;
  /** FHIR Practitioner.id, used to scope every query. */
  practitionerId: number;
  /** Active organisation ID, if any. */
  orgId: string | null;
  /** Localised base href for appointment detail/action pages. */
  viewHref: string;
  /** Localised base href for Clinical Records. */
  clinicalRecordsHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Top-level layout for the appointment-demo page. The real app shell (top
 * navbar, left nav) is provided by the (apps) layout and the external Bezs
 * menu service — this component only renders the page's own content area,
 * matching how every other doctor page under that layout works.
 */
export function AppointmentDemo({
  initialToday,
  practitionerId,
  orgId,
  viewHref,
  clinicalRecordsHref,
}: AppointmentDemoProps) {
  const router = useRouter();
  const [pickerDate, setPickerDate] = useState<Date>(() => new Date());

  // ── Tab-strip counts — cheap, always-on, independent of which tab is mounted ──
  const countQueries = {
    today: useQuery({
      queryKey: appointmentDemoKeys.count({ tab: "today", practitionerId, orgId }),
      queryFn: () => fetchDemoTabCount({ tab: "today", practitionerId, orgId }),
      initialData: initialToday.total,
      staleTime: 60_000,
    }),
    upcoming: useQuery({
      queryKey: appointmentDemoKeys.count({ tab: "upcoming", practitionerId, orgId }),
      queryFn: () => fetchDemoTabCount({ tab: "upcoming", practitionerId, orgId }),
      staleTime: 60_000,
    }),
    past: useQuery({
      queryKey: appointmentDemoKeys.count({ tab: "past", practitionerId, orgId }),
      queryFn: () => fetchDemoTabCount({ tab: "past", practitionerId, orgId }),
      staleTime: 60_000,
    }),
    cancelled: useQuery({
      queryKey: appointmentDemoKeys.count({ tab: "cancelled", practitionerId, orgId }),
      queryFn: () => fetchDemoTabCount({ tab: "cancelled", practitionerId, orgId }),
      staleTime: 60_000,
    }),
  };

  // ── Today's stat cards + status donut — the whole day, not just one page ──
  const todaySummaryQuery = useQuery({
    queryKey: appointmentDemoKeys.todaySummary({ practitionerId, orgId }),
    queryFn: () => fetchDemoTodaySummary({ practitionerId, orgId }),
    staleTime: 60_000,
  });

  // ── Mini calendar highlight dates ─────────────────────────────────────────
  const calendarQuery = useQuery({
    queryKey: appointmentDemoKeys.calendar({ practitionerId, orgId }),
    queryFn: () => fetchDemoCalendarMonth({ practitionerId, orgId }),
    staleTime: 60_000,
  });

  // ── Row action callbacks — shared across every tab's table ──────────────
  const callbacks: AppointmentDemoColumnCallbacks = useMemo(
    () => ({
      onView: (row) => router.push(`${viewHref}/${row.id}`),
      onReview: (row) => router.push(`${viewHref}/${row.id}/review`),
      onConsult: (row) =>
        router.push(`${viewHref}/online-consultation?appointmentId=${row.id}`),
      onInPersonConsult: (row) =>
        router.push(`${viewHref}/inperson-consultation?appointmentId=${row.id}`),
      onConfirm: (row) =>
        doctorStore.getState().onOpen({ type: "confirmAppointment", data: { appointment: row } }),
      onReschedule: (row) =>
        doctorStore
          .getState()
          .onOpen({ type: "rescheduleAppointment", data: { appointment: row } }),
      onCancel: (row) =>
        doctorStore.getState().onOpen({ type: "cancelAppointment", data: { appointment: row } }),
      onClinicalRecords: (row) =>
        router.push(`${clinicalRecordsHref}/${row.subject_id}/${row.id}`),
    }),
    [router, viewHref, clinicalRecordsHref],
  );

  const summary = todaySummaryQuery.data;
  const STAT_CARDS = [
    {
      key: "appointmentsToday",
      label: "Appointments Today",
      value: summary?.appointmentsToday ?? initialToday.total,
      icon: CalendarClock,
      iconClass: "bg-blue-100 text-blue-600",
    },
    {
      key: "telemedicine",
      label: "Telemedicine",
      value: summary?.telemedicine ?? 0,
      icon: Video,
      iconClass: "bg-green-100 text-green-600",
    },
    {
      key: "inPerson",
      label: "In-Person",
      value: summary?.inPerson ?? 0,
      icon: Users,
      iconClass: "bg-violet-100 text-violet-600",
    },
    {
      key: "pendingNotes",
      label: "Pending Notes",
      value: summary?.pendingNotesCount ?? 0,
      icon: FileText,
      iconClass: "bg-orange-100 text-orange-600",
    },
  ];

  const QUICK_ACTIONS = [
    { label: "Block Time", icon: CalendarClock },
    { label: "Add Patient", icon: UserPlus },
    { label: "Start Instant Consult", icon: Video },
    { label: "View Waiting Room", icon: Users },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
      {/* ── Main column ── */}
      <div className="space-y-5 min-w-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">My Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage your scheduled consultations, meetings and follow-ups.
          </p>
        </div>

        {/* Tabs + date picker */}
        <Tabs defaultValue="today">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList variant="line">
              {TABS.map((tab) => {
                const query = countQueries[tab.value];
                const count = query.isLoading ? "…" : (query.data ?? 0);
                return (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="size-3.5" />
                  {formatDisplayDateLong(pickerDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={pickerDate}
                  onSelect={(date) => date && setPickerDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
              {tab.value === "today" && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {STAT_CARDS.map((stat) => (
                    <Card key={stat.key} className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.iconClass}`}
                        >
                          <stat.icon className="size-4.5" />
                        </div>
                        <div>
                          <div className="text-xl font-bold leading-tight">
                            {stat.value}
                          </div>
                          <div className="text-xs text-muted-foreground leading-tight">
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <AppointmentDemoTabPanel
                tab={tab.value}
                practitionerId={practitionerId}
                orgId={orgId}
                callbacks={callbacks}
                emptyMessage={tab.emptyMessage}
                initialData={tab.value === "today" ? initialToday : undefined}
                enableStatusFilter={tab.enableStatusFilter}
                enableDateFilter={tab.enableDateFilter}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Right rail ── */}
      <div className="space-y-4">
        <DemoCalendarPanel today={new Date()} highlightDates={calendarQuery.data ?? []} />

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Today&apos;s Overview</h2>
          <TodaysOverviewDonut
            counts={
              summary?.statusBreakdown ?? {
                completed: 0,
                "in-progress": 0,
                scheduled: 0,
                cancelled: 0,
              }
            }
          />
        </Card>

        <Card className="p-2">
          <h2 className="text-sm font-semibold px-2 pt-1.5 pb-2">Quick Actions</h2>
          <div className="flex flex-col">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <action.icon className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{action.label}</span>
                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-violet-50 to-blue-50 border-violet-100 dark:from-violet-950/30 dark:to-blue-950/30 dark:border-violet-900">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white">
              <Stethoscope className="size-4.5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Let DrGodly AI help you</h3>
                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get patient summaries, draft notes, check guidelines and more.
              </p>
            </div>
          </div>
        </Card>

        <Badge
          variant="outline"
          className="w-full justify-center py-1.5 text-[11px] text-muted-foreground font-normal"
        >
          Design prototype — real, server-paginated appointment data
        </Badge>
      </div>
    </div>
  );
}
