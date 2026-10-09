/**
 * @file AppointmentDemo.tsx
 * @description Doctor "My Appointments" screen — rendered at
 * /doctor/appointments (see that route's page.tsx). Started life as a
 * visual-redesign prototype at a separate /doctor/appointment-demo route;
 * that route is gone now that this replaced the original single-list
 * DoctorAppointmentsTable-based page. The file/identifier names here (and
 * in its sibling files) still say "Demo" — a naming cleanup pass, not a
 * functional change, that hasn't happened yet. Each tab (Today/Upcoming/
 * Past/Cancelled) is its own AppointmentDemoTabPanel — a self-contained
 * useServerDataTable + useQuery instance — so pagination, sorting, and
 * every filter are resolved server-side via listAppointmentsAction, never
 * client-side. This component only owns the cross-tab bits: the tab-strip
 * counts, the "Today" stat cards/donut summary, and the mini calendar.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { CalendarClock, FileText, Users, Video } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
 * Top-level layout for the doctor appointments page. The app shell (top
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

  // ── Mini calendar (right rail) — month shown + a picked date range, kept
  // here (not local to DemoCalendarPanel) because both drive a network
  // fetch: month re-queries the highlight dots for that month, and a picked
  // range is two-way synced with whichever tab is showing — it flows down
  // to filter that tab's list, and any change the doctor makes in that
  // tab's own "Time" column filter flows back up to update the calendar.
  const [activeTab, setActiveTab] = useState<DemoTab>("today");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarRange, setCalendarRange] = useState<DateRange | null>(null);

  /* Switching tabs clears the range rather than carrying it over silently —
     each tab has its own "Time" filter state, so a range picked while
     looking at Past shouldn't keep filtering Upcoming once you switch. */
  const handleTabChange = (value: string) => {
    setActiveTab(value as DemoTab);
    setCalendarRange(null);
  };

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

  // ── Mini calendar highlight dates — refetches per shown month, not just
  // once for "now", so navigating months actually updates the dots. ──────
  const calendarQuery = useQuery({
    queryKey: appointmentDemoKeys.calendar({
      practitionerId,
      orgId,
      month: calendarMonth,
    }),
    queryFn: () => fetchDemoCalendarMonth({ practitionerId, orgId, month: calendarMonth }),
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

        {/* Tabs — controlled so switching tabs can clear the mini calendar's
            picked range (see handleTabChange) instead of letting it silently
            keep filtering whichever tab you land on next. */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
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
                calendarRange={calendarRange}
                onCalendarRangeChange={setCalendarRange}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Right rail ── */}
      {/* Below xl the outer 2-col layout above collapses to one column, so
          these two cards would otherwise stack full-width one under the
          other beneath the table — side by side reads much better at that
          width. At xl+ they're back in the narrow 320px sidebar, where
          side-by-side wouldn't fit, so this returns to a single column. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <DemoCalendarPanel
          today={new Date()}
          highlightDates={calendarQuery.data ?? []}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          range={calendarRange}
          onRangeChange={setCalendarRange}
        />

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Today&apos;s Overview</h2>
          <TodaysOverviewDonut counts={summary?.statusBreakdown ?? {}}
          />
        </Card>
      </div>
    </div>
  );
}
