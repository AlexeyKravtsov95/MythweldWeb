/**
 * Paginated search for the bot's startup-message markers.
 *
 * Safety contract: the probe may answer "absent" only when the relevant
 * history was scanned completely. If a page budget is exhausted or a read
 * fails, the result is "unknown" — the executor then refuses to send,
 * preferring a blocked step over a duplicated message.
 */
import type { MessageProbe } from "./planner.js";

export interface ProbeMessage {
  readonly id: string;
  readonly authorId: string;
  /** Footer texts of the message embeds (marker detection). */
  readonly footerTexts: readonly string[];
}

export interface ProbeNeedle {
  readonly botUserId: string;
  readonly markerFooter: string;
}

export interface TextHistoryBudget {
  readonly pageLimit: number;
  readonly maxPages: number;
}

/** Up to 1000 recent messages; beyond that the probe answers "unknown". */
export const DEFAULT_TEXT_HISTORY_BUDGET: TextHistoryBudget = {
  pageLimit: 100,
  maxPages: 10,
};

function messageMatches(message: ProbeMessage, needle: ProbeNeedle): boolean {
  return (
    message.authorId === needle.botUserId &&
    message.footerTexts.includes(needle.markerFooter)
  );
}

function validNeedle(needle: ProbeNeedle): boolean {
  return needle.botUserId.length > 0 && needle.markerFooter.length > 0;
}

/**
 * Walks the channel history backwards (newest → oldest) page by page.
 * `fetchPage(before)` must return a non-empty page sorted newest first,
 * or an empty array when the beginning of the history is reached.
 */
export async function probeTextHistory(
  fetchPage: (before: string | undefined) => Promise<readonly ProbeMessage[]>,
  needle: ProbeNeedle,
  budget: TextHistoryBudget = DEFAULT_TEXT_HISTORY_BUDGET,
): Promise<MessageProbe> {
  if (!validNeedle(needle)) {
    return "unknown";
  }
  let before: string | undefined = undefined;
  for (let page = 0; page < budget.maxPages; page += 1) {
    let messages: readonly ProbeMessage[];
    try {
      messages = await fetchPage(before);
    } catch {
      return "unknown";
    }
    if (messages.length === 0) {
      // Reached the beginning of the channel history — the marker is
      // definitely not there.
      return "absent";
    }
    if (messages.some((message) => messageMatches(message, needle))) {
      return "sent";
    }
    const lastId = messages[messages.length - 1]?.id;
    if (lastId === undefined) {
      return "unknown";
    }
    before = lastId;
  }
  // Budget exhausted — the history is too large to verify completely.
  return "unknown";
}

export type StarterProbe =
  | { readonly status: "ok"; readonly message: ProbeMessage }
  | { readonly status: "deleted" }
  | { readonly status: "unreadable" };

export interface ProbeThread {
  readonly id: string;
  readonly starter: StarterProbe;
}

export interface ArchivedPage {
  readonly threads: readonly ProbeThread[];
  readonly hasMore: boolean;
}

export interface ForumHistoryBudget {
  readonly archivedPageLimit: number;
  readonly archivedMaxPages: number;
}

/** Up to 500 archived threads per forum; beyond that the probe is "unknown". */
export const DEFAULT_FORUM_HISTORY_BUDGET: ForumHistoryBudget = {
  archivedPageLimit: 100,
  archivedMaxPages: 5,
};

function threadMatches(thread: ProbeThread, needle: ProbeNeedle): boolean {
  return (
    thread.starter.status === "ok" &&
    messageMatches(thread.starter.message, needle)
  );
}

/**
 * Checks active threads (complete list) and then archived threads page by
 * page. A starter message that exists but cannot be read makes the result
 * "unknown" — its marker status cannot be determined.
 */
export async function probeForumHistory(
  fetchActiveThreads: () => Promise<readonly ProbeThread[]>,
  fetchArchivedPage: (before: string | undefined) => Promise<ArchivedPage>,
  needle: ProbeNeedle,
  budget: ForumHistoryBudget = DEFAULT_FORUM_HISTORY_BUDGET,
): Promise<MessageProbe> {
  if (!validNeedle(needle)) {
    return "unknown";
  }
  let sawUnreadable = false;
  let active: readonly ProbeThread[];
  try {
    active = await fetchActiveThreads();
  } catch {
    return "unknown";
  }
  if (active.some((thread) => threadMatches(thread, needle))) {
    return "sent";
  }
  sawUnreadable = active.some(
    (thread) => thread.starter.status === "unreadable",
  );

  let before: string | undefined = undefined;
  for (let page = 0; page < budget.archivedMaxPages; page += 1) {
    let archived: ArchivedPage;
    try {
      archived = await fetchArchivedPage(before);
    } catch {
      return "unknown";
    }
    if (archived.threads.some((thread) => threadMatches(thread, needle))) {
      return "sent";
    }
    if (
      archived.threads.some((thread) => thread.starter.status === "unreadable")
    ) {
      sawUnreadable = true;
    }
    if (archived.threads.length === 0 || !archived.hasMore) {
      // Discord reported the end of the archive (or an empty page) —
      // the full scan is complete, no extra page is requested.
      return sawUnreadable ? "unknown" : "absent";
    }
    const lastId = archived.threads[archived.threads.length - 1]?.id;
    if (lastId === undefined) {
      return "unknown";
    }
    before = lastId;
  }
  return "unknown";
}
