import { describe, expect, it } from "vitest";
import {
  probeForumHistory,
  probeTextHistory,
  type ArchivedPage,
  type ProbeMessage,
  type ProbeThread,
  type StarterProbe,
} from "../src/probe.js";

const BOT = "200000000000000002";
const MARKER = "mythweld-bootstrap/welcome";

const needle = { botUserId: BOT, markerFooter: MARKER };

function msg(id: string, withMarker: boolean, authorId = BOT): ProbeMessage {
  return {
    id,
    authorId,
    footerTexts: withMarker ? [MARKER] : [],
  };
}

/** Pages sorted newest → oldest, as Discord returns them. */
function makePages(pages: readonly (readonly ProbeMessage[])[]) {
  const calls: (string | undefined)[] = [];
  const fetchPage = async (
    before: string | undefined,
  ): Promise<readonly ProbeMessage[]> => {
    calls.push(before);
    if (before === undefined) {
      return pages[0] ?? [];
    }
    // The cursor is the last message of the previous page.
    const index = pages.findIndex(
      (page) => page[page.length - 1]?.id === before,
    );
    if (index === -1) {
      return [];
    }
    return pages[index + 1] ?? [];
  };
  return { fetchPage, calls };
}

describe("probeTextHistory — постраничный поиск маркера (FIX-3)", () => {
  it("находит маркер на первой странице", async () => {
    const { fetchPage } = makePages([[msg("3", false), msg("2", true)], []]);
    await expect(probeTextHistory(fetchPage, needle)).resolves.toBe("sent");
  });

  it("находит старое сообщение за пределами первой страницы", async () => {
    const { fetchPage, calls } = makePages([
      [msg("30", false), msg("29", false)],
      [msg("20", false), msg("19", true)],
      [msg("10", false)],
      [],
    ]);
    await expect(probeTextHistory(fetchPage, needle)).resolves.toBe("sent");
    // Продолжение поиска шло от последнего сообщения первой страницы.
    expect(calls[1]).toBe("29");
  });

  it("возвращает absent только при полном просмотре истории до конца", async () => {
    const { fetchPage } = makePages([[msg("3", false)], []]);
    await expect(probeTextHistory(fetchPage, needle)).resolves.toBe("absent");
  });

  it("возвращает unknown при исчерпании бюджета страниц", async () => {
    const { fetchPage } = makePages([
      [msg("10", false)],
      [msg("9", false)],
      [msg("8", false)],
      [msg("7", false)],
      [msg("6", false)],
      [msg("5", false)],
      [msg("4", false)],
      [msg("3", false)],
      [msg("2", false)],
      [msg("1", false)],
      [msg("0", false)],
      [],
    ]);
    await expect(probeTextHistory(fetchPage, needle)).resolves.toBe("unknown");
  });

  it("возвращает unknown при ошибке чтения страницы", async () => {
    const fetchPage = async (): Promise<readonly ProbeMessage[]> => {
      throw new Error("403 Forbidden");
    };
    await expect(probeTextHistory(fetchPage, needle)).resolves.toBe("unknown");
  });

  it("сообщения других авторов с чужим футером не считаются маркером", async () => {
    const strangerWithFooter: ProbeMessage = {
      id: "1",
      authorId: "999000000000000001",
      footerTexts: [MARKER],
    };
    const { fetchPage } = makePages([[strangerWithFooter], []]);
    await expect(probeTextHistory(fetchPage, needle)).resolves.toBe("absent");
  });
});

function thread(id: string, starter: StarterProbe): ProbeThread {
  return { id, starter };
}

const deleted: StarterProbe = { status: "deleted" };
const unreadable: StarterProbe = { status: "unreadable" };

const EMPTY_PAGE: ArchivedPage = { threads: [], hasMore: false };

/** Serves archived pages sequentially: first call → pages[0], then by cursor. */
function makeArchived(pages: readonly ArchivedPage[]) {
  const calls: (string | undefined)[] = [];
  const fetchArchivedPage = async (
    before: string | undefined,
  ): Promise<ArchivedPage> => {
    calls.push(before);
    if (before === undefined) {
      return pages[0] ?? EMPTY_PAGE;
    }
    // The cursor is the last thread of the previous page.
    const index = pages.findIndex(
      (page) => page.threads[page.threads.length - 1]?.id === before,
    );
    if (index === -1) {
      return EMPTY_PAGE;
    }
    return pages[index + 1] ?? EMPTY_PAGE;
  };
  return { fetchArchivedPage, calls };
}

describe("probeForumHistory — активные и архивные темы (FIX-3)", () => {
  it("находит маркер в активной теме", async () => {
    const result = await probeForumHistory(
      async () => [thread("t1", { status: "ok", message: msg("m1", true) })],
      async () => EMPTY_PAGE,
      needle,
    );
    expect(result).toBe("sent");
  });

  it("находит маркер в архивной теме за пределами первой архивной страницы", async () => {
    const { fetchArchivedPage, calls } = makeArchived([
      {
        threads: [thread("a2", deleted), thread("a1", deleted)],
        hasMore: true,
      },
      {
        threads: [thread("a0", { status: "ok", message: msg("m0", true) })],
        hasMore: false,
      },
      EMPTY_PAGE,
    ]);
    const result = await probeForumHistory(
      async () => [],
      fetchArchivedPage,
      needle,
    );
    expect(result).toBe("sent");
    expect(calls).toEqual([undefined, "a1"]);
  });

  it("возвращает absent при полном просмотре архивных тем без маркера", async () => {
    const { fetchArchivedPage } = makeArchived([
      { threads: [thread("a1", deleted)], hasMore: true },
      EMPTY_PAGE,
    ]);
    const result = await probeForumHistory(
      async () => [thread("t1", { status: "ok", message: msg("m1", false) })],
      fetchArchivedPage,
      needle,
    );
    expect(result).toBe("absent");
  });

  it("возвращает unknown при исчерпании бюджета архивных страниц", async () => {
    // Стабичная «вечная» страница: скан никогда не дойдёт до конца.
    const eternal: ArchivedPage = {
      threads: [thread("a1", deleted)],
      hasMore: true,
    };
    const result = await probeForumHistory(
      async () => [],
      async () => eternal,
      needle,
    );
    expect(result).toBe("unknown");
  });

  it("возвращает unknown при нечитаемом стартовом сообщении темы", async () => {
    const result = await probeForumHistory(
      async () => [thread("t1", unreadable)],
      async () => EMPTY_PAGE,
      needle,
    );
    expect(result).toBe("unknown");
  });

  it("возвращает unknown при ошибке чтения архива", async () => {
    const result = await probeForumHistory(
      async () => [],
      async () => {
        throw new Error("500");
      },
      needle,
    );
    expect(result).toBe("unknown");
  });

  it("возвращает unknown при ошибке чтения активных тем", async () => {
    const result = await probeForumHistory(
      async () => {
        throw new Error("403");
      },
      async () => EMPTY_PAGE,
      needle,
    );
    expect(result).toBe("unknown");
  });

  it("пустой needle даёт unknown вместо ложного absent", async () => {
    const result = await probeTextHistory(async () => [], {
      botUserId: "",
      markerFooter: MARKER,
    });
    expect(result).toBe("unknown");
  });
});
