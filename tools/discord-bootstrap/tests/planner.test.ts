import { describe, expect, it } from "vitest";
import { buildPlan, type GuildSnapshot } from "../src/planner.js";
import { TARGET_CONFIG } from "../src/config.js";
import { STARTUP_MESSAGES } from "../src/messages.js";
import { fullExistingState, GUILD_ID } from "./helpers.js";

function snapshot(
  channels: GuildSnapshot["channels"],
  roles: GuildSnapshot["roles"] = [],
  probes: GuildSnapshot["messageProbes"] = {},
): GuildSnapshot {
  return { guildId: GUILD_ID, channels, roles, messageProbes: probes };
}

describe("buildPlan — планирование (сценарии 1, 3, 9, 12)", () => {
  it("1: планирует создание всех отсутствующих категорий и каналов на пустом сервере", () => {
    const plan = buildPlan(TARGET_CONFIG, STARTUP_MESSAGES, snapshot([]));

    expect(plan.categories).toHaveLength(5);
    expect(
      plan.categories.every((category) => category.action === "create"),
    ).toBe(true);
    expect(plan.channels).toHaveLength(8);
    expect(plan.channels.every((channel) => channel.action === "create")).toBe(
      true,
    );
    expect(plan.roles.every((role) => role.action === "create")).toBe(true);
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.messages.every((message) => message.action === "send")).toBe(
      true,
    );
  });

  it("3: корректно определяет уже существующие каналы, категории и роли", () => {
    const state = fullExistingState();
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(state.channels, state.roles),
    );

    expect(
      plan.categories.every((category) => category.action === "exists"),
    ).toBe(true);
    expect(plan.channels.every((channel) => channel.action === "exists")).toBe(
      true,
    );
    expect(plan.roles.every((role) => role.action === "exists")).toBe(true);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("9: отказ при конфликте типа — канал welcome существует как голосовой", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([{ id: "1", name: "welcome", type: "voice", parentId: null }]),
    );

    const welcome = plan.channels.find(
      (channel) => channel.channelKey === "welcome",
    );
    expect(welcome?.action).toBe("conflict");
    expect(welcome?.conflict?.kind).toBe("channel-type-mismatch");
    expect(plan.conflicts.length).toBeGreaterThan(0);
    // Сообщение в конфликтный канал не планируется.
    expect(
      plan.messages.find((message) => message.channelKey === "welcome")?.action,
    ).toBe("blocked");
  });

  it("9: отказ, когда канал существует вне целевой категории", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        { id: "cat", name: "COMMUNITY", type: "category", parentId: null },
        { id: "ch", name: "general", type: "text", parentId: null },
      ]),
    );

    const general = plan.channels.find(
      (channel) => channel.channelKey === "general",
    );
    expect(general?.action).toBe("conflict");
    expect(general?.conflict?.kind).toBe("channel-outside-target-category");
  });

  it("9: анонсный канал вместо текстового считается конфликтом типа", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        {
          id: "1",
          name: "announcements",
          type: "announcement",
          parentId: null,
        },
      ]),
    );

    const announcements = plan.channels.find(
      (channel) => channel.channelKey === "announcements",
    );
    expect(announcements?.action).toBe("conflict");
    expect(announcements?.conflict?.kind).toBe("channel-type-mismatch");
  });

  it("12: сообщение не планируется повторно, когда маркер уже найден", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([], [], { welcome: "sent" }),
    );

    expect(
      plan.messages.find((message) => message.channelKey === "welcome")?.action,
    ).toBe("skip");
    expect(
      plan.messages.find((message) => message.channelKey === "rules")?.action,
    ).toBe("send");
  });

  it("сообщение блокируется, когда историю канала проверить не удалось", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([], [], { rules: "unknown" }),
    );

    expect(
      plan.messages.find((message) => message.channelKey === "rules")?.action,
    ).toBe("blocked");
  });

  it("существующие read-only и staff-каналы получают предупреждения о ручной проверке", () => {
    const state = fullExistingState();
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(state.channels, state.roles),
    );

    expect(plan.warnings.some((warning) => warning.includes("welcome"))).toBe(
      true,
    );
    expect(plan.warnings.some((warning) => warning.includes("mod-log"))).toBe(
      true,
    );
    expect(plan.warnings.some((warning) => warning.includes("Moderator"))).toBe(
      true,
    );
  });
});
