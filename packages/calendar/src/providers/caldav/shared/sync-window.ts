import { getOAuthSyncWindow } from "../../../core/oauth/sync-window";

interface CalDAVSyncWindow {
  start: Date;
  end: Date;
}

const getCalDAVSyncWindow = (
  monthsUntilFuture: number,
  startOfToday?: Date,
): CalDAVSyncWindow => {
  const oauthSyncWindow = getOAuthSyncWindow(monthsUntilFuture, startOfToday);
  return {
    end: oauthSyncWindow.timeMax,
    start: oauthSyncWindow.timeMin,
  };
};

export { getCalDAVSyncWindow };
export type { CalDAVSyncWindow };
