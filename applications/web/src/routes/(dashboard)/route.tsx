import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { AnimatePresence, LazyMotion } from "motion/react";
import { loadMotionFeatures } from "@/lib/motion-features";
import * as m from "motion/react-m";
import { popoverOverlayAtom } from "@/state/popover-overlay";
import { SyncProvider } from "@/providers/sync-provider";
import { resolveDashboardRedirect } from "@/lib/route-access-guards";
import { signOut } from "@/lib/auth";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import useSWR from "swr";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Settings from "lucide-react/dist/esm/icons/settings";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import AlignJustify from "lucide-react/dist/esm/icons/align-justify";
import Info from "lucide-react/dist/esm/icons/info";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import type { ReactNode } from "react";

export const Route = createFileRoute("/(dashboard)")({
  beforeLoad: ({ context }) => {
    const redirectTarget = resolveDashboardRedirect(context.auth.hasSession());
    if (redirectTarget) {
      throw redirect({ to: redirectTarget });
    }
  },
  component: DashboardLayout,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
    links: [
      {
        rel: "preload",
        href: "/assets/fonts/GeistMono-variable.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
});

function DashboardLayout() {
  const overlayActive = useAtomValue(popoverOverlayAtom);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0f1b27]">
      <DashboardSidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <LazyMotion features={loadMotionFeatures}>
          <AnimatePresence>
            {overlayActive && (
              <m.div
                className="fixed inset-0 z-10 backdrop-blur-[2px] bg-black/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>
        </LazyMotion>
        <SyncProvider />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

type NavItemProps = {
  to: string;
  icon: ReactNode;
  label: string;
  exact?: boolean;
};

function NavItem({ to, icon, label, exact = false }: NavItemProps) {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      className="group/nav relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors text-white/40 hover:text-white/70 hover:bg-white/[0.05] aria-[current=page]:text-[#4da6ff] aria-[current=page]:bg-white/[0.07]"
    >
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[#4da6ff] rounded-r-full opacity-0 group-aria-[current=page]/nav:opacity-100 transition-opacity" />
      <span className="text-current">{icon}</span>
      {label}
    </Link>
  );
}

interface SessionResponse {
  user: { id: string; username?: string; name?: string; email?: string } | null;
}

function DashboardSidebar() {
  const navigate = useNavigate();
  const { data: session } = useSWR<SessionResponse>("/api/auth/get-session");

  const username = session?.user?.username ?? session?.user?.name ?? session?.user?.email ?? "Account";
  const initial = username[0]?.toUpperCase() ?? "?";

  const handleLogout = async () => {
    track(ANALYTICS_EVENTS.logout);
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <aside className="w-[268px] shrink-0 h-dvh bg-[#0b1520] border-r border-white/[0.05] flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="size-9 bg-[#1a6fc4] rounded-xl flex items-center justify-center shrink-0">
          <CalendarIcon size={17} className="text-white" />
        </div>
        <span className="text-white font-semibold text-[15px] tracking-tight">Keeper.sh</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/25 px-3 pt-1 pb-2">
          Main
        </div>
        <NavItem to="/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" exact />
        <NavItem to="/dashboard/connect" icon={<CalendarIcon size={15} />} label="Calendars" />
        <NavItem to="/dashboard/events" icon={<AlignJustify size={15} />} label="Events" />
        <NavItem to="/dashboard/ical" icon={<Link2 size={15} />} label="iCal Link" />

        <div className="my-2 mx-3 border-t border-white/[0.06]" />

        <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/25 px-3 pb-2">
          Support
        </div>
        <NavItem to="/dashboard/feedback" icon={<MessageSquare size={15} />} label="Feedback" />
        <NavItem to="/dashboard/report" icon={<Info size={15} />} label="Report Problem" />

        <div className="my-2 mx-3 border-t border-white/[0.06]" />

        <NavItem to="/dashboard/settings" icon={<Settings size={15} />} label="Settings" />
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-0.5">
          <div className="size-7 rounded-lg bg-[#1a6fc4] flex items-center justify-center text-white font-semibold text-[12px] shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white/80 truncate">{username}</div>
            <div className="text-[11px] text-white/30">Free plan</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
}
