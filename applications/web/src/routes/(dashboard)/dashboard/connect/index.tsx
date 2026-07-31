import { createFileRoute, Link } from "@tanstack/react-router";
import useSWR from "swr";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import type { ReactNode } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { PremiumFeatureGate } from "@/components/ui/primitives/upgrade-hint";
import { useEntitlements, canAddMore } from "@/hooks/use-entitlements";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import { pluralize } from "@/lib/pluralize";
import type { CalendarAccount } from "@/types/api";

export const Route = createFileRoute("/(dashboard)/dashboard/connect/")({
  component: ConnectPage,
});

interface ConnectProvider {
  label: string;
  to: string;
  analyticsProvider: string;
  icon: ReactNode;
}

const OAUTH_PROVIDERS: ConnectProvider[] = [
  {
    label: "Google Calendar",
    to: "/dashboard/connect/google",
    analyticsProvider: "google",
    icon: <img src="/integrations/icon-google.svg" alt="" width={18} height={18} />,
  },
  {
    label: "Outlook",
    to: "/dashboard/connect/outlook",
    analyticsProvider: "outlook",
    icon: <img src="/integrations/icon-outlook.svg" alt="" width={18} height={18} />,
  },
  {
    label: "iCloud",
    to: "/dashboard/connect/apple",
    analyticsProvider: "apple",
    icon: <img src="/integrations/icon-icloud.svg" alt="" width={18} height={18} />,
  },
  {
    label: "Microsoft 365",
    to: "/dashboard/connect/microsoft",
    analyticsProvider: "microsoft",
    icon: <img src="/integrations/icon-microsoft-365.svg" alt="" width={18} height={18} />,
  },
  {
    label: "Fastmail",
    to: "/dashboard/connect/fastmail",
    analyticsProvider: "fastmail",
    icon: <img src="/integrations/icon-fastmail.svg" alt="" width={18} height={18} />,
  },
];

const MANUAL_PROVIDERS: ConnectProvider[] = [
  {
    label: "Subscribe to ICS Calendar Feed",
    to: "/dashboard/connect/ical-link",
    analyticsProvider: "ical",
    icon: <LinkIcon size={18} />,
  },
  {
    label: "Connect CalDAV Server",
    to: "/dashboard/connect/caldav",
    analyticsProvider: "caldav",
    icon: <Calendar size={18} />,
  },
];

function ConnectPage() {
  const { data: accounts = [] } = useSWR<CalendarAccount[]>("/api/accounts");
  const { data: entitlements } = useEntitlements();
  const atLimit = !canAddMore(entitlements?.accounts);

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
        <div>
          <h1 className="text-[16px] font-semibold text-white/90">Calendars</h1>
          <p className="text-[12px] text-white/40 mt-0.5">Manage your connected calendar accounts</p>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
              Connected Accounts
            </h2>
            {accounts.length > 0 && (
              <span className="text-[12px] text-white/25">
                {pluralize(accounts.length, "account")}
              </span>
            )}
          </div>
          {accounts.length === 0 ? (
            <EmptyAccountsState />
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </section>

        <PremiumFeatureGate locked={atLimit} hint="Account limit reached.">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-3">
              Add a Calendar
            </h2>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              {OAUTH_PROVIDERS.map((provider, i) => (
                <div
                  key={provider.to}
                  data-visitors-event={ANALYTICS_EVENTS.calendar_connect_started}
                  data-visitors-provider={provider.analyticsProvider}
                  className={i < OAUTH_PROVIDERS.length - 1 ? "border-b border-white/[0.05]" : ""}
                >
                  <ProviderConnectRow provider={provider} disabled={atLimit} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden mt-2">
              {MANUAL_PROVIDERS.map((provider, i) => (
                <div
                  key={provider.to}
                  data-visitors-event={ANALYTICS_EVENTS.calendar_connect_started}
                  data-visitors-provider={provider.analyticsProvider}
                  className={i < MANUAL_PROVIDERS.length - 1 ? "border-b border-white/[0.05]" : ""}
                >
                  <ProviderConnectRow provider={provider} disabled={atLimit} />
                </div>
              ))}
            </div>
          </section>
        </PremiumFeatureGate>
      </div>
    </div>
  );
}

function EmptyAccountsState() {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="size-12 rounded-xl bg-[#1a6fc4]/20 flex items-center justify-center">
        <CalendarPlus size={22} className="text-[#4da6ff]" />
      </div>
      <div>
        <div className="text-[14px] font-medium text-white/70 mb-1">No calendars connected</div>
        <div className="text-[12px] text-white/30 max-w-[240px]">
          Connect Google, Outlook, CalDAV, or an iCal feed to start syncing.
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: CalendarAccount }) {
  return (
    <Link
      to="/dashboard/accounts/$accountId"
      params={{ accountId: account.id }}
      className="group flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.11] transition-colors"
    >
      <div className="size-9 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0">
        <ProviderIcon provider={account.provider} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-white/80 truncate">{account.accountLabel}</span>
          {account.needsReauthentication && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 shrink-0">
              <AlertTriangle size={10} />
              Reconnect
            </span>
          )}
        </div>
        <div className="text-[12px] text-white/30 mt-0.5">
          {pluralize(account.calendarCount, "calendar")} · {account.providerName}
        </div>
      </div>
      <ChevronRight size={15} className="text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
    </Link>
  );
}

function ProviderConnectRow({ provider, disabled }: { provider: ConnectProvider; disabled: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 opacity-40 cursor-not-allowed">
        <span className="text-white/40 shrink-0">{provider.icon}</span>
        <span className="flex-1 text-[13px] font-medium text-white/50">{provider.label}</span>
        <ChevronRight size={15} className="text-white/20 shrink-0" />
      </div>
    );
  }

  return (
    <Link
      to={provider.to}
      className="group flex items-center gap-3 px-4 py-3.5 text-white/60 hover:text-white/90 hover:bg-white/[0.03] transition-colors"
    >
      <span className="shrink-0">{provider.icon}</span>
      <span className="flex-1 text-[13px] font-medium">{provider.label}</span>
      <ChevronRight size={15} className="text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
    </Link>
  );
}
