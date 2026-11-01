import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import { buildPlan, type GuildSnapshot } from "../src/planner.js";
import { TARGET_CONFIG } from "../src/config.js";
import { STARTUP_MESSAGES } from "../src/messages.js";
import { fullExistingState, GUILD_ID, typicalEveryoneBits } from "./helpers.js";

function snapshot(
  channels: GuildSnapshot["channels"],
  roles: GuildSnapshot["roles"] = [],
  probes: GuildSnapshot["messageProbes"] = {},
  everyonePermissions: bigint = typicalEveryoneBits(),
): GuildSnapshot {
  return {
    guildId: GUILD_ID,
    everyonePermissions,
    channels,
    roles,
    messageProbes: probes,
  };
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

describe("предупреждения по фактическим правам @everyone (dry-run)", () => {
  it("типичные права — предупреждение о read-only тредах, которые бот не может запретить", () => {
    const plan = buildPlan(TARGET_CONFIG, STARTUP_MESSAGES, snapshot([]));

    expect(
      plan.warnings.some((warning) => warning.includes("read-only каналы")),
    ).toBe(true);
    // read-only примечание само упоминает thread-права, но предупреждения
    // «отключено …» о нехватке прав форумов быть не должно.
    expect(plan.warnings.some((warning) => warning.includes("отключено"))).toBe(
      false,
    );
  });

  it("отключённый Send Messages in Threads — предупреждение об ответах в форумах", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(
        [],
        [],
        {},
        typicalEveryoneBits() & ~PermissionFlagsBits.SendMessagesInThreads,
      ),
    );

    expect(
      plan.warnings.some((warning) =>
        warning.includes("Send Messages in Threads"),
      ),
    ).toBe(true);
  });

  it("отключённый Send Messages — предупреждение о постах в форумах и #general", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(
        [],
        [],
        {},
        typicalEveryoneBits() & ~PermissionFlagsBits.SendMessages,
      ),
    );

    expect(
      plan.warnings.some((warning) =>
        warning.includes("отключено Send Messages"),
      ),
    ).toBe(true);
  });

  it("@everyone без thread-прав — предупреждение только об ответах в форумах, без read-only примечания", () => {
    const conservative =
      PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages;
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([], [], {}, conservative),
    );

    const everyoneWarnings = plan.warnings.filter((warning) =>
      warning.includes("@everyone"),
    );
    // Send Messages есть, thread-прав нет: остаётся единственное
    // предупреждение об ответах в форумах; read-only примечание не нужно —
    // треды уже закрыты отсутствием прав.
    expect(everyoneWarnings).toHaveLength(1);
    expect(everyoneWarnings[0]).toContain("Send Messages in Threads");
    expect(plan.warnings.some((w) => w.includes("read-only каналы"))).toBe(
      false,
    );
  });
});
