import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import {
  buildPlan,
  type GuildSnapshot,
  type SnapshotChannel,
} from "../src/planner.js";
import { TARGET_CONFIG } from "../src/config.js";
import { STARTUP_MESSAGES } from "../src/messages.js";
import type { SnapshotOverwrite } from "../src/permissions.js";
import {
  fullExistingState,
  GUILD_ID,
  securedExistingState,
  typicalEveryoneBits,
} from "./helpers.js";

const THREAD_RIGHTS = [
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
];

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

function chan(
  id: string,
  name: string,
  type: SnapshotChannel["type"],
  parentId: string | null = null,
  overwrites: readonly SnapshotOverwrite[] = [],
): SnapshotChannel {
  return { id, name, type, parentId, permissionOverwrites: overwrites };
}

function category(
  id: string,
  name: string,
  overwrites: readonly SnapshotOverwrite[] = [],
): SnapshotChannel {
  return chan(id, name, "category", null, overwrites);
}

/** @everyone overwrite shorthand (allow/deny bits are OR-ed). */
function everyone(
  allow: readonly bigint[] = [],
  deny: readonly bigint[] = [],
): SnapshotOverwrite {
  return {
    id: GUILD_ID,
    allow: allow.reduce((acc, bit) => acc | bit, 0n),
    deny: deny.reduce((acc, bit) => acc | bit, 0n),
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
      snapshot([chan("1", "welcome", "voice")]),
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
      snapshot([category("cat", "COMMUNITY"), chan("ch", "general", "text")]),
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
      snapshot([chan("1", "announcements", "announcement")]),
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

  it("существующие каналы без настроек дают точные предупреждения доступа", () => {
    const state = fullExistingState();
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(state.channels, state.roles),
    );

    // welcome (read-only) фактически доступен на запись.
    expect(
      plan.accessAudit.some(
        (warning) =>
          warning.includes("welcome") && warning.includes("отправлять"),
      ),
    ).toBe(true);
    // STAFF-категория и mod-log видимы — явные риски.
    expect(plan.accessAudit.some((warning) => warning.includes("STAFF"))).toBe(
      true,
    );
    expect(
      plan.accessAudit.some((warning) => warning.includes("mod-log")),
    ).toBe(true);
    // Предупреждение о существующей роли сохраняется.
    expect(plan.warnings.some((warning) => warning.includes("Moderator"))).toBe(
      true,
    );
    // Аудит доступа зеркалится в warnings (dry-run печатает их).
    for (const entry of plan.accessAudit) {
      expect(plan.warnings).toContain(entry);
    }
  });
});

describe("аудит существующих read-only каналов по фактическим оверрайтам", () => {
  const readOnlyDenied = everyone(
    [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    [PermissionFlagsBits.SendMessages, ...THREAD_RIGHTS],
  );

  it("после ручного запрета Send Messages и thread-прав предупреждений нет", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-info", "INFORMATION"),
        chan("ch-welcome", "welcome", "text", "cat-info", [readOnlyDenied]),
      ]),
    );

    expect(
      plan.accessAudit.filter((warning) => warning.includes("welcome")),
    ).toHaveLength(0);
  });

  it("deny только Send Messages — предупреждение ровно про остаточные thread-права", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-info", "INFORMATION"),
        chan("ch-welcome", "welcome", "text", "cat-info", [
          everyone([], [PermissionFlagsBits.SendMessages]),
        ]),
      ]),
    );

    const welcomeWarnings = plan.accessAudit.filter((warning) =>
      warning.includes("welcome"),
    );
    expect(welcomeWarnings).toHaveLength(1);
    expect(welcomeWarnings[0]).toContain("thread-права");
    expect(welcomeWarnings[0]).toContain("Send Messages in Threads");
    expect(welcomeWarnings[0]).not.toContain("отправлять сообщения");
  });

  it("канал без оверрайтов — предупреждение и про отправку, и про треды", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-info", "INFORMATION"),
        chan("ch-welcome", "welcome", "text", "cat-info"),
      ]),
    );

    const welcomeWarning = plan.accessAudit.find((warning) =>
      warning.includes("welcome"),
    );
    expect(welcomeWarning).toBeDefined();
    expect(welcomeWarning).toContain("отправлять сообщения");
    expect(welcomeWarning).toContain("thread-права");
  });

  it("deny только на родительской категории НЕ закрывает несинхронизированный канал", () => {
    // Discord использует permission syncing (копию), а не runtime-наследование:
    // доступ в канале определяют только его собственные оверрайты.
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-info", "INFORMATION", [readOnlyDenied]),
        chan("ch-welcome", "welcome", "text", "cat-info"),
      ]),
    );

    const welcomeWarning = plan.accessAudit.find((warning) =>
      warning.includes("welcome"),
    );
    expect(welcomeWarning).toBeDefined();
    expect(welcomeWarning).toContain("отправлять сообщения");
  });

  it("канальные оверрайты решают сами: allow Send Messages оставляет канал открытым", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-info", "INFORMATION", [readOnlyDenied]),
        // Категория закрыта, но канал не синхронизирован и разрешает отправку.
        chan("ch-welcome", "welcome", "text", "cat-info", [
          everyone([PermissionFlagsBits.SendMessages]),
        ]),
      ]),
    );

    const welcomeWarning = plan.accessAudit.find((warning) =>
      warning.includes("welcome"),
    );
    expect(welcomeWarning).toContain("отправлять сообщения");
  });
});

describe("аудит существующих форумов по фактическим оверрайтам", () => {
  const forumAllow = everyone([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.SendMessages,
  ]);

  it("форум с нужными правами (Send Messages + глобальный Send Messages in Threads) — без предупреждений", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-fj", "FOREVER JOURNEY"),
        chan("ch-fj", "fj-support", "forum", "cat-fj", [forumAllow]),
      ]),
    );

    expect(
      plan.accessAudit.filter((warning) => warning.includes("fj-support")),
    ).toHaveLength(0);
  });

  it("глобально выключенный Send Messages in Threads — предупреждение об ответах с именем форума", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(
        [
          category("cat-fj", "FOREVER JOURNEY"),
          chan("ch-fj", "fj-support", "forum", "cat-fj", [forumAllow]),
        ],
        [],
        {},
        typicalEveryoneBits() & ~PermissionFlagsBits.SendMessagesInThreads,
      ),
    );

    const forumWarning = plan.accessAudit.find((warning) =>
      warning.includes("fj-support"),
    );
    expect(forumWarning).toContain("отвечать");
    expect(forumWarning).toContain("Send Messages in Threads");
  });

  it("Send Messages закрыт в самом форуме — предупреждение о создании постов", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-fj", "FOREVER JOURNEY"),
        // Канал не синхронизирован и закрыт сам по себе.
        chan("ch-fj", "fj-support", "forum", "cat-fj", [
          everyone([], [PermissionFlagsBits.SendMessages]),
        ]),
      ]),
    );

    const forumWarning = plan.accessAudit.find((warning) =>
      warning.includes("fj-support"),
    );
    expect(forumWarning).toContain("создавать посты");
  });

  it("deny Send Messages только на категории форум не закрывает", () => {
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-fj", "FOREVER JOURNEY", [
          everyone([], [PermissionFlagsBits.SendMessages]),
        ]),
        chan("ch-fj", "fj-support", "forum", "cat-fj"),
      ]),
    );

    expect(
      plan.accessAudit.filter((warning) => warning.includes("fj-support")),
    ).toHaveLength(0);
  });
});

describe("аудит приватности существующих STAFF и mod-log", () => {
  it("видимые STAFF-категория и mod-log дают отдельные предупреждения-риски", () => {
    const state = fullExistingState();
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(state.channels, state.roles),
    );

    const staffWarnings = plan.accessAudit.filter((warning) =>
      warning.includes("STAFF"),
    );
    expect(staffWarnings.length).toBeGreaterThanOrEqual(1);
    expect(
      plan.accessAudit.some((warning) => warning.includes("mod-log")),
    ).toBe(true);
    for (const warning of staffWarnings) {
      expect(warning).toContain("View Channel");
    }
  });

  it("скрытые STAFF-категория и mod-log не дают предупреждений", () => {
    const state = fullExistingState();
    const hidden = everyone([], [PermissionFlagsBits.ViewChannel]);
    const channels = state.channels.map((channel) =>
      channel.name === "STAFF" || channel.name === "mod-log"
        ? { ...channel, permissionOverwrites: [hidden] }
        : channel,
    );

    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(channels, state.roles),
    );

    expect(
      plan.accessAudit.filter((warning) => warning.includes("STAFF")),
    ).toHaveLength(0);
    expect(
      plan.accessAudit.filter((warning) => warning.includes("mod-log")),
    ).toHaveLength(0);
  });

  it("скрытая STAFF-категория не скрывает несинхронизированный видимый mod-log (регрессия)", () => {
    // Категория закрыта deny View Channel, но mod-log не синхронизирован
    // и собственных deny не имеет — фактический доступ публичный, аудит
    // обязан это обнаружить (syncing — копия, не наследование).
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-staff", "STAFF", [
          everyone([], [PermissionFlagsBits.ViewChannel]),
        ]),
        chan("ch-modlog", "mod-log", "text", "cat-staff"),
      ]),
    );

    const modLogWarning = plan.accessAudit.find((warning) =>
      warning.includes("mod-log"),
    );
    expect(modLogWarning).toBeDefined();
    expect(modLogWarning).toContain("View Channel");
    // Сама категория закрыта — риска по ней нет (предупреждение канала
    // содержит "(STAFF)" в метке, поэтому фильтруем именно по категории).
    expect(
      plan.accessAudit.filter((warning) => warning.includes("Категория")),
    ).toHaveLength(0);
  });

  it("публичная STAFF-категория при явно закрытом mod-log даёт риск только по категории", () => {
    // Обратный сценарий: категория видима, но канал закрыт собственным
    // deny — предупреждения о публичности самого канала быть не должно.
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot([
        category("cat-staff", "STAFF"),
        chan("ch-modlog", "mod-log", "text", "cat-staff", [
          everyone([], [PermissionFlagsBits.ViewChannel]),
        ]),
      ]),
    );

    expect(
      plan.accessAudit.some((warning) => warning.includes("Категория")),
    ).toBe(true);
    expect(
      plan.accessAudit.filter((warning) => warning.includes("mod-log")),
    ).toHaveLength(0);
  });

  it("полностью настроенный сервер (securedExistingState) — аудит доступа пуст", () => {
    const state = securedExistingState();
    const plan = buildPlan(
      TARGET_CONFIG,
      STARTUP_MESSAGES,
      snapshot(state.channels, state.roles),
    );

    expect(plan.accessAudit).toHaveLength(0);
  });
});

describe("аудит каналов, которые будут созданы (прогноз)", () => {
  it("создаваемый read-only канал — предупреждение про остаточные thread-права", () => {
    const plan = buildPlan(TARGET_CONFIG, STARTUP_MESSAGES, snapshot([]));

    const welcomeWarning = plan.accessAudit.find((warning) =>
      warning.includes("welcome"),
    );
    expect(welcomeWarning).toBeDefined();
    expect(welcomeWarning).toContain("thread-права");
    // Отправку сообщений бот закрывает сам — предупреждения об этом нет.
    expect(welcomeWarning).not.toContain("отправлять сообщения");
  });

  it("создаваемые форумы обеспечены Send Messages; ответы зависят от глобальных прав", () => {
    const plan = buildPlan(TARGET_CONFIG, STARTUP_MESSAGES, snapshot([]));
    expect(
      plan.accessAudit.filter(
        (warning) =>
          warning.includes("fj-support") ||
          warning.includes("book-creator") ||
          warning.includes("talentforge-support"),
      ),
    ).toHaveLength(0);

    const withoutThreadReplies = buildPlan(
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
      withoutThreadReplies.accessAudit.filter((warning) =>
        warning.includes("Форум"),
      ),
    ).toHaveLength(3);
  });
});
