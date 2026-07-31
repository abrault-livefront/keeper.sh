import { describe, expect, it } from "vitest";
import {
  getDeterministicRefreshOffset,
  getOAuthSyncTokenVersion,
  getOAuthSyncWindow,
  getOAuthSyncWindowStart,
  resolveSyncLookaheadMonths,
} from "../../../src/core/oauth/sync-window";

describe("oauth sync window", () => {
  it("returns a start date seven days before the provided day boundary", () => {
    const providedStartOfToday = new Date("2026-03-09T00:00:00.000Z");

    const lookbackStart = getOAuthSyncWindowStart(providedStartOfToday);

    expect(lookbackStart.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });

  it("returns a window with lookback start and a configured future bound in whole years", () => {
    const providedStartOfToday = new Date("2026-03-09T00:00:00.000Z");

    const syncWindow = getOAuthSyncWindow(24, providedStartOfToday);

    expect(syncWindow.timeMin.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(syncWindow.timeMax.toISOString()).toBe("2028-03-09T00:00:00.000Z");
  });

  it("supports a sub-year future bound expressed in months", () => {
    const providedStartOfToday = new Date("2026-03-09T00:00:00.000Z");

    const syncWindow = getOAuthSyncWindow(6, providedStartOfToday);

    expect(syncWindow.timeMax.toISOString()).toBe("2026-09-09T00:00:00.000Z");
  });

  it("staggers seven-day token refresh boundaries deterministically per calendar", () => {
    const calendarA = "calendar-a";
    const calendarB = "calendar-b";
    const offsetA = getDeterministicRefreshOffset(calendarA);
    const offsetB = getDeterministicRefreshOffset(calendarB);
    expect(offsetA).not.toBe(offsetB);

    const fleetBoundary = new Date("2026-07-02T00:00:00.000Z");
    const beforeFleetBoundary = new Date(fleetBoundary.getTime() - 1);
    const baseVersion = getOAuthSyncTokenVersion(0, beforeFleetBoundary, calendarA);
    expect(getOAuthSyncTokenVersion(0, beforeFleetBoundary, calendarB)).toBe(baseVersion);

    let earlierCalendar = calendarA;
    let laterCalendar = calendarB;
    if (offsetB < offsetA) {
      earlierCalendar = calendarB;
      laterCalendar = calendarA;
    }
    const earlierOffset = Math.min(offsetA, offsetB);
    expect(getOAuthSyncTokenVersion(
      0,
      new Date(fleetBoundary.getTime() + earlierOffset),
      earlierCalendar,
    )).toBe(baseVersion + 100);
    expect(getOAuthSyncTokenVersion(
      0,
      new Date(fleetBoundary.getTime() + earlierOffset),
      laterCalendar,
    )).toBe(baseVersion);
  });
});

describe("resolveSyncLookaheadMonths", () => {
  it("defaults to 24 months when unset", () => {
    expect(resolveSyncLookaheadMonths(undefined)).toBe(24);
  });

  it("defaults to 24 months for an empty string", () => {
    expect(resolveSyncLookaheadMonths("")).toBe(24);
  });

  it("parses a configured value", () => {
    expect(resolveSyncLookaheadMonths("6")).toBe(6);
  });

  it("falls back to 24 months for a non-numeric value", () => {
    expect(resolveSyncLookaheadMonths("not-a-number")).toBe(24);
  });

  it("falls back to 24 months for a zero or negative value", () => {
    expect(resolveSyncLookaheadMonths("0")).toBe(24);
    expect(resolveSyncLookaheadMonths("-6")).toBe(24);
  });
});
