import { MS_PER_DAY } from "@keeper.sh/constants";

const getStartOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const OAUTH_SYNC_LOOKBACK_DAYS = 7;
const OAUTH_SYNC_WINDOW_VERSION = 4;
const OAUTH_SYNC_LOOKBACK_MS = OAUTH_SYNC_LOOKBACK_DAYS * MS_PER_DAY;
const OAUTH_SYNC_TOKEN_REFRESH_MS = 7 * MS_PER_DAY;

const DEFAULT_SYNC_LOOKAHEAD_MONTHS = 24;

const resolveSyncLookaheadMonths = (rawValue: string | undefined): number => {
  if (!rawValue) {
    return DEFAULT_SYNC_LOOKAHEAD_MONTHS;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SYNC_LOOKAHEAD_MONTHS;
  }
  return parsed;
};

const SYNC_LOOKAHEAD_MONTHS = resolveSyncLookaheadMonths(process.env.SYNC_LOOKAHEAD_MONTHS);

const getDeterministicRefreshOffset = (calendarKey: string): number => {
  if (calendarKey.length === 0) {
    return 0;
  }
  const digest = new Bun.CryptoHasher("sha256").update(calendarKey).digest("hex");
  const hashPrefix = Number.parseInt(digest.slice(0, 12), 16);
  return hashPrefix % OAUTH_SYNC_TOKEN_REFRESH_MS;
};

const getOAuthSyncTokenVersion = (
  adapterVersion = 0,
  now: Date = new Date(),
  calendarKey = "",
): number => {
  const refreshOffset = getDeterministicRefreshOffset(calendarKey);
  const refreshPeriod = Math.floor(
    (now.getTime() - refreshOffset) / OAUTH_SYNC_TOKEN_REFRESH_MS,
  );
  return refreshPeriod * 100 + OAUTH_SYNC_WINDOW_VERSION * 10 + adapterVersion;
};

interface OAuthSyncWindow {
  timeMin: Date;
  timeMax: Date;
}

const getOAuthSyncWindowStart = (startOfToday: Date = getStartOfToday()): Date =>
  new Date(startOfToday.getTime() - OAUTH_SYNC_LOOKBACK_MS);

const getOAuthSyncWindow = (
  monthsUntilFuture: number,
  startOfToday: Date = getStartOfToday(),
): OAuthSyncWindow => {
  const timeMin = getOAuthSyncWindowStart(startOfToday);
  const timeMax = new Date(startOfToday);
  timeMax.setMonth(timeMax.getMonth() + monthsUntilFuture);
  return { timeMax, timeMin };
};

export {
  OAUTH_SYNC_WINDOW_VERSION,
  SYNC_LOOKAHEAD_MONTHS,
  getDeterministicRefreshOffset,
  getOAuthSyncTokenVersion,
  getOAuthSyncWindowStart,
  getOAuthSyncWindow,
  resolveSyncLookaheadMonths,
};
export type { OAuthSyncWindow };
