import { describe, expect, it } from "vitest";
import {
  footerMarker,
  MESSAGE_LINKS,
  STARTUP_MESSAGES,
  type EmbedInput,
} from "../src/messages.js";
import { findChannel } from "../src/config.js";

const ALLOWED = new Set(MESSAGE_LINKS);

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)`<>]+/g) ?? [];
  // Trailing markdown/word characters are not part of the URL.
  return matches.map((url) => url.replace(/[.,;:]+$/, ""));
}

describe("стартовые сообщения", () => {
  it("для каждого канала определено сообщение, и kind совпадает с конфигурацией", () => {
    expect(STARTUP_MESSAGES).toHaveLength(6);
    for (const message of STARTUP_MESSAGES) {
      const channel = findChannel(message.channelKey);
      expect(channel, message.channelKey).toBeDefined();
      expect(message.channelKind).toBe(channel?.kind);
    }
  });

  it("каждое сообщение содержит пару эмбедов EN и RU с уникальным маркером", () => {
    const markers = new Set<string>();
    for (const message of STARTUP_MESSAGES) {
      expect(message.embeds).toHaveLength(2);
      for (const embed of message.embeds) {
        expect(embed.title.length).toBeGreaterThan(0);
        expect(embed.description.length).toBeGreaterThan(0);
        expect(embed.footerText).toBe(footerMarker(message.channelKey));
      }
      const hasCyrillic = (embed: EmbedInput) =>
        /[А-Яа-яЁё]/.test(embed.description);
      expect(message.embeds.some(hasCyrillic)).toBe(true);
      expect(message.embeds.some((embed) => !hasCyrillic(embed))).toBe(true);
      markers.add(footerMarker(message.channelKey));
    }
    expect(markers.size).toBe(STARTUP_MESSAGES.length);
  });

  it("использует только подтверждённые ссылки", () => {
    for (const message of STARTUP_MESSAGES) {
      for (const embed of message.embeds) {
        for (const url of extractUrls(embed.description)) {
          expect(ALLOWED.has(url), `unexpected link ${url}`).toBe(true);
        }
      }
    }
    expect([...ALLOWED].sort()).toEqual(
      [
        "https://mythweld.com/",
        "https://journal.mythweld.com/",
        "https://www.curseforge.com/wow/addons/forever-journey",
      ].sort(),
    );
  });

  it("инструкции форумов предупреждают об удалении персональных данных из SavedVariables", () => {
    for (const key of ["fj-support", "book-creator", "talentforge-support"]) {
      const message = STARTUP_MESSAGES.find(
        (candidate) => candidate.channelKey === key,
      );
      expect(message, key).toBeDefined();
      const text = message!.embeds.map((embed) => embed.description).join("\n");
      expect(text).toContain("SavedVariables");
      expect(text.toLowerCase()).toContain("personal data");
      expect(text).toContain("персональные данные");
      // Шаблон баг-репорта: версия, окружение, шаги, ожидаемый и фактический результат.
      expect(text.toLowerCase()).toContain("version");
      expect(text.toLowerCase()).toContain("reproduce");
      expect(text.toLowerCase()).toContain("expected result");
    }
  });

  it("правила запрещают публикацию токенов и секретов", () => {
    const rules = STARTUP_MESSAGES.find(
      (message) => message.channelKey === "rules",
    )!;
    const text = rules.embeds.map((embed) => embed.description).join("\n");
    expect(text).toContain("tokens");
    expect(text).toContain("токены");
  });

  it("заголовки постов форумов укладываются в лимит Discord (100 символов)", () => {
    for (const message of STARTUP_MESSAGES) {
      if (message.channelKind === "forum") {
        expect(message.title.length).toBeLessThanOrEqual(100);
        expect(message.title.length).toBeGreaterThan(0);
      }
    }
  });
});
