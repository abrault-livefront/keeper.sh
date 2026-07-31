import { createFileRoute, Link } from "@tanstack/react-router";
import useSWR from "swr";
import { SyncStatus } from "@/features/dashboard/components/sync-status";
import { EventGraph } from "@/features/dashboard/components/event-graph";
import type { CalendarSource } from "@/types/api";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Bug from "lucide-react/dist/esm/icons/bug";
import Bell from "lucide-react/dist/esm/icons/bell";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { ReactNode } from "react";

export const Route = createFileRoute("/(dashboard)/dashboard/")({
  component: DashboardPage,
});

interface SessionResponse {
  user: { id: string; username?: string; name?: string; email?: string } | null;
}

function DashboardPage() {
  const { data: session } = useSWR<SessionResponse>("/api/auth/get-session");
  const username = session?.user?.username ?? session?.user?.name ?? "Account";
  const initial = username[0]?.toUpperCase() ?? "?";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
        <span className="text-[13px] text-white/40">Your calendar sync overview</span>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-white/30">{formattedDate}</span>
          <button
            type="button"
            className="size-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
          >
            <Bell size={15} />
          </button>
          <div className="size-8 rounded-lg bg-[#1a6fc4] flex items-center justify-center text-white font-semibold text-[12px]">
            {initial}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-5">
        <SyncStatus />
        <EventGraph />
        <div className="grid grid-cols-2 gap-4">
          <CalendarSourcesCard />
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}

function CalendarSourcesCard() {
  const { data: calendars = [] } = useSWR<CalendarSource[]>("/api/sources");

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
          Calendar Sources
        </h3>
        <Link
          to="/dashboard/connect"
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#4da6ff] border border-[#4da6ff]/30 hover:bg-[#4da6ff]/10 transition-colors"
        >
          Add source
        </Link>
      </div>
      {calendars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="size-12 rounded-xl bg-[#1a6fc4]/20 flex items-center justify-center">
            <CalendarIcon size={22} className="text-[#4da6ff]" />
          </div>
          <div>
            <div className="text-[14px] font-medium text-white/70 mb-1">No Calendars</div>
            <div className="text-[12px] text-white/30 max-w-[200px]">
              Connect Google, Outlook, CalDAV, or an iCal link to start syncing.
            </div>
          </div>
          <Link
            to="/dashboard/connect"
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#4da6ff] border border-[#4da6ff]/30 hover:bg-[#4da6ff]/10 transition-colors"
          >
            Import Calendars
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {calendars.map((c) => (
            <Link
              key={c.id}
              to="/dashboard/accounts/$accountId/$calendarId"
              params={{ accountId: c.accountId, calendarId: c.id }}
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS: Array<{ label: string; icon: ReactNode; to: string }> = [
  { label: "Import Calendars", icon: <CalendarPlus size={16} />, to: "/dashboard/connect" },
  { label: "Copy iCal Link", icon: <Link2 size={16} />, to: "/dashboard/ical" },
  { label: "Submit Feedback", icon: <MessageSquare size={16} />, to: "/dashboard/feedback" },
  { label: "Report a Problem", icon: <Bug size={16} />, to: "/dashboard/report" },
];

function QuickActionsCard() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 flex flex-col gap-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
        Quick Actions
      </h3>
      <div className="flex flex-col">
        {QUICK_ACTIONS.map(({ label, icon, to }) => (
          <Link
            key={label}
            to={to}
            className="group flex items-center gap-3 px-2 py-3 rounded-lg text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
          >
            <span className="text-white/30 group-hover:text-white/60 transition-colors">{icon}</span>
            <span className="flex-1 text-[13px] font-medium">{label}</span>
            <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
