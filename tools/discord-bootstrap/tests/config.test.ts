import { describe, expect, it } from "vitest";
import { ConfigError, loadEnv, redactSecrets } from "../src/config.js";

const TOKEN = "super-secret-token-abc123";
const GUILD = "123456789012345678";

describe("loadEnv", () => {
  it("читает валидные значения", () => {
    const env = loadEnv({
      DISCORD_BOT_TOKEN: ` ${TOKEN} `,
      DISCORD_GUILD_ID: GUILD,
    });
    expect(env.botToken).toBe(TOKEN);
    expect(env.guildId).toBe(GUILD);
  });

  it("требует токен", () => {
    expect(() => loadEnv({ DISCORD_GUILD_ID: GUILD })).toThrow(ConfigError);
    try {
      loadEnv({ DISCORD_GUILD_ID: GUILD });
    } catch (error) {
      expect((error as ConfigError).message).toContain("DISCORD_BOT_TOKEN");
    }
  });

  it("отклоняет некорректный guild id, не раскрывая токен (сценарий 11)", () => {
    try {
      loadEnv({
        DISCORD_BOT_TOKEN: TOKEN,
        DISCORD_GUILD_ID: "not-a-snowflake",
      });
      expect.unreachable("loadEnv must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const message = (error as ConfigError).message;
      expect(message).toContain("DISCORD_GUILD_ID");
      expect(message).not.toContain(TOKEN);
    }
  });

  it("guild id должен быть снежинкой из 17–20 цифр", () => {
    expect(() =>
      loadEnv({ DISCORD_BOT_TOKEN: TOKEN, DISCORD_GUILD_ID: "123" }),
    ).toThrow(ConfigError);
    expect(() =>
      loadEnv({
        DISCORD_BOT_TOKEN: TOKEN,
        DISCORD_GUILD_ID: "123456789012345678901",
      }),
    ).toThrow(ConfigError);
    expect(() =>
      loadEnv({
        DISCORD_BOT_TOKEN: TOKEN,
        DISCORD_GUILD_ID: "1234567890abcdefgh",
      }),
    ).toThrow(ConfigError);
  });
});

describe("redactSecrets (сценарий 11)", () => {
  it("заменяет все вхождения секрета плейсхолдером", () => {
    const text = `login failed for ${TOKEN} near ${TOKEN}`;
    const redacted = redactSecrets(text, [TOKEN]);
    expect(redacted).not.toContain(TOKEN);
    expect(redacted).toBe("login failed for [REDACTED] near [REDACTED]");
  });

  it("игнорирует пустые секреты", () => {
    expect(redactSecrets("plain text", [""])).toBe("plain text");
  });
});
