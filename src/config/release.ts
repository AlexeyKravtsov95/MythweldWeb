/**
 * Single source of release facts: store statuses, store links, talent data
 * version and the date they were last checked. Components read these values;
 * markup never hard-codes them. Values follow the v3.2 Release checklist;
 * the talent data version matches the TalentForge class picker screenshot.
 */
export type ReleaseState = "available" | "testing" | "prep";

export interface Release {
  /** ISO date the values below were last confirmed. */
  checked: string;
  talentforge: {
    android: ReleaseState;
    ios: ReleaseState;
    /** `null` until the store listing is public. */
    googlePlay: string | null;
    appStore: string | null;
    dataVersion: string;
  };
}

export const RELEASE = {
  checked: "2026-10-26",
  talentforge: {
    android: "testing",
    ios: "prep",
    googlePlay: null,
    appStore: null,
    dataVersion: "1.60.1",
  },
} as const satisfies Release;
