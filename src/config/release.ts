/**
 * Single source of release facts: store statuses, store links, talent data
 * version and the date they were last checked. Components read these values;
 * markup never hard-codes them. Values follow the v3.2 Release checklist;
 * the talent data version matches the TalentForge class picker screenshot.
 */
export type ReleaseState = "available" | "testing" | "prep";
/** Waiting for review to start; does not imply an active Apple review. */
export type TalentForgeReleaseState = ReleaseState | "awaiting_review";

export interface Release {
  /** ISO date the values below were last confirmed. */
  checked: string;
  talentforge: {
    android: ReleaseState;
    ios: TalentForgeReleaseState;
    /** `null` until the store listing is public. */
    googlePlay: string | null;
    appStore: string | null;
    dataVersion: string;
    /** App features that exist in the repository but are not public yet. */
    upcoming: {
      /**
       * TalentForge 1.2 (W1.04): copy a saved build to newer talent data.
       * The page section and its screenshots render only once the owner
       * confirms the public rollout by setting `released` to `true`.
       */
      buildMigration: {
        version: "1.2";
        released: boolean;
      };
    };
  };
  foreverJourney: {
    /** State of the addon listing on CurseForge (`SITE.links.curseforge`). */
    curseforge: ReleaseState;
  };
}

export const RELEASE = {
  checked: "2026-11-10",
  talentforge: {
    android: "available",
    ios: "awaiting_review",
    googlePlay:
      "https://play.google.com/store/apps/details?id=io.github.alexeykravtsov95.talentforge",
    appStore: null,
    dataVersion: "1.60.1",
    upcoming: {
      buildMigration: {
        version: "1.2",
        released: false,
      },
    },
  },
  foreverJourney: {
    curseforge: "available",
  },
} as const satisfies Release;
