import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import { runApply, runDryRun, type ApplyOptions } from "../src/executor.js";
import {
  FakeDiscordApi,
  allRequiredBotBits,
  fullExistingState,
  typicalEveryoneBits,
} from "./helpers.js";

const TEST_TOKEN = "test-secret-bot-token-do-not-print";

function options(confirmResult: boolean): ApplyOptions {
  return {
    confirm: async () => confirmResult,
    secrets: [TEST_TOKEN],
  };
}

describe("runDryRun (сценарий 5)", () => {
  it("не выполняет никаких мутаций", async () => {
    const fake = new FakeDiscordApi();
    const plan = await runDryRun(fake);

    expect(plan.categories).toHaveLength(5);
    expect(fake.mutations).toBe(0);
    expect(fake.createdRoles).toHaveLength(0);
    expect(fake.createdCategoryRecords).toHaveLength(0);
    expect(fake.createdChannels).toHaveLength(0);
    expect(fake.sentMessages).toHaveLength(0);
  });
});

describe("runApply — успешное применение (сценарии 2, 4, 12)", () => {
  it("2: создаёт текстовые каналы и форумы с правильными типами, тегами и родителем", async () => {
    const fake = new FakeDiscordApi();
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied");
    expect(fake.createdRoles.map((role) => role.name).sort()).toEqual([
      "Developer",
      "Member",
      "Moderator",
    ]);
    expect(
      fake.createdCategoryRecords.map((record) => record.input.name),
    ).toEqual([
      "INFORMATION",
      "FOREVER JOURNEY",
      "TALENTFORGE",
      "COMMUNITY",
      "STAFF",
    ]);

    const textKeys = [
      "welcome",
      "rules",
      "announcements",
      "general",
      "mod-log",
    ];
    const forumKeys = ["fj-support", "book-creator", "talentforge-support"];
    for (const input of fake.createdChannels) {
      const categoryId = fake.createdCategoryRecords.find(
        (record) => record.input.categoryKey === input.categoryKey,
      )?.id;
      expect(input.parentId).toBe(categoryId);
      if (textKeys.includes(input.channelKey)) {
        expect(input.kind).toBe("text");
        expect(input.forumTags).toHaveLength(0);
      } else if (forumKeys.includes(input.channelKey)) {
        expect(input.kind).toBe("forum");
        expect(input.forumTags).toEqual([
          "Bug",
          "Question",
          "Feature Request",
          "Resolved",
        ]);
      } else {
        throw new Error(`unexpected channel ${input.channelKey}`);
      }
    }
    // Снапшот фейка отражает созданные типы каналов (5 текстовых + 3 форума).
    expect(
      fake.channels.filter((channel) => channel.type === "forum"),
    ).toHaveLength(3);
    expect(
      fake.channels.filter((channel) => channel.type === "text"),
    ).toHaveLength(5);
    expect(fake.sentMessages).toHaveLength(6);
  });

  it("4: повторный Apply не создаёт дубликаты и не отправляет сообщения повторно", async () => {
    const fake = new FakeDiscordApi();
    await runApply(fake, options(true));
    const mutationsAfterFirst = fake.mutations;
    const channelsAfterFirst = fake.channels.length;

    const second = await runApply(fake, options(true));

    expect(second.status).toBe("applied");
    expect(fake.mutations).toBe(mutationsAfterFirst);
    expect(fake.channels).toHaveLength(channelsAfterFirst);
    expect(fake.createdCategoryRecords).toHaveLength(5);
    expect(fake.createdChannels).toHaveLength(8);
    expect(fake.sentMessages).toHaveLength(6);
    const skipped = second.steps.filter((step) => step.status === "skipped");
    expect(skipped.length).toBe(3 + 5 + 8 + 6);
  });

  it("12: существующий маркер сообщения подавляет повторную отправку", async () => {
    const state = fullExistingState();
    const fake = new FakeDiscordApi();
    fake.channels = [...state.channels];
    fake.roles = [...state.roles];
    fake.messageProbes = { welcome: "sent" };

    await runApply(fake, options(true));

    expect(
      fake.sentMessages.map((sent) => sent.message.channelKey),
    ).not.toContain("welcome");
    expect(fake.sentMessages).toHaveLength(5);
  });
});

describe("runApply — защита (сценарии 8, 9, 10, 11)", () => {
  it("8: останавливается при недостаточных правах бота и ничего не меняет", async () => {
    const fake = new FakeDiscordApi({
      permissionsBitfield:
        PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
    });
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("permission-denied");
    expect(fake.mutations).toBe(0);
    const check = outcome.steps.find(
      (step) => step.label === "Проверка прав бота",
    );
    expect(check?.status).toBe("failed");
    expect(check?.detail).toContain("ManageChannels");
    expect(check?.detail).toContain("ManageRoles");
  });

  it("отменяется без изменений, когда владелец не подтвердил", async () => {
    const fake = new FakeDiscordApi();
    const outcome = await runApply(fake, options(false));

    expect(outcome.status).toBe("aborted");
    expect(fake.mutations).toBe(0);
  });

  it("9: конфликтный канал не создаётся, остальные создаются", async () => {
    const fake = new FakeDiscordApi();
    fake.channels.push({
      id: "existing",
      name: "welcome",
      type: "voice",
      parentId: null,
    });

    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied-with-errors");
    expect(fake.createdChannels.map((input) => input.channelKey)).not.toContain(
      "welcome",
    );
    expect(fake.createdChannels.map((input) => input.channelKey)).toContain(
      "rules",
    );
    expect(
      fake.sentMessages.map((sent) => sent.message.channelKey),
    ).not.toContain("welcome");
  });

  it("10: частичный сбой не мешает остальным шагам, повторный запуск завершает работу", async () => {
    const fake = new FakeDiscordApi();
    fake.failCategoryKeys.add("community");

    const first = await runApply(fake, options(true));

    expect(first.status).toBe("applied-with-errors");
    expect(
      fake.createdCategoryRecords.map((c) => c.input.categoryKey),
    ).not.toContain("community");
    expect(fake.createdChannels.map((c) => c.channelKey)).not.toContain(
      "general",
    );
    expect(fake.createdChannels.map((c) => c.channelKey)).toContain("welcome");
    expect(fake.sentMessages).toHaveLength(6);

    fake.failCategoryKeys.clear();
    const mutationsBeforeResume = fake.mutations;
    const second = await runApply(fake, options(true));

    expect(second.status).toBe("applied");
    // Второй запуск создал только недостающее.
    expect(
      fake.createdCategoryRecords.filter(
        (c) => c.input.categoryKey === "community",
      ),
    ).toHaveLength(1);
    expect(
      fake.createdChannels.filter((c) => c.channelKey === "general"),
    ).toHaveLength(1);
    expect(fake.channels.filter((c) => c.name === "general")).toHaveLength(1);
    expect(fake.mutations).toBe(mutationsBeforeResume + 2);
  });

  it("11: секрет не попадает в отчёт об ошибке", async () => {
    class ThrowingRoleApi extends FakeDiscordApi {
      public override async createRole(): Promise<{ readonly id: string }> {
        throw new Error(
          `DiscordAPIError: unauthorized for token ${TEST_TOKEN}`,
        );
      }
    }
    const fake = new ThrowingRoleApi();
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied-with-errors");
    const details = outcome.steps.map((step) => step.detail).join("\n");
    expect(details).not.toContain(TEST_TOKEN);
    expect(details).toContain("[REDACTED]");
  });
});

describe("права ролей в пределах фактических прав бота (финальное ревью)", () => {
  it("FakeDiscordApi отклоняет роль с правами, которых нет у бота", async () => {
    const fake = new FakeDiscordApi(); // ровно шесть документированных прав
    const exceeding = allRequiredBotBits() | PermissionFlagsBits.KickMembers;

    await expect(
      fake.createRole({
        roleKey: "moderator",
        name: "Moderator",
        permissionsBitfield: exceeding,
      }),
    ).rejects.toThrow(/Missing Permissions/);

    // Administrator у бота снимает ограничение (семантика Discord).
    const adminBot = new FakeDiscordApi({
      permissionsBitfield:
        allRequiredBotBits() | PermissionFlagsBits.Administrator,
    });
    await expect(
      adminBot.createRole({
        roleKey: "moderator",
        name: "Moderator",
        permissionsBitfield: exceeding,
      }),
    ).resolves.toMatchObject({ id: expect.any(String) });
  });

  it("успешный Apply на пустом сервере с ровно шестью правами бота создаёт роли в их пределах", async () => {
    const fake = new FakeDiscordApi(); // permissionsBitfield = 6 прав invite
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied");
    expect(fake.createdRoles).toHaveLength(3);
    for (const role of fake.createdRoles) {
      expect(
        (role.permissionsBitfield & ~fake.permissionsBitfield) === 0n,
        `${role.name}: грант выходит за права бота`,
      ).toBe(true);
    }
    // Каналы и сообщения также созданы полностью.
    expect(fake.createdCategoryRecords).toHaveLength(5);
    expect(fake.createdChannels).toHaveLength(8);
    expect(fake.sentMessages).toHaveLength(6);
  });
});

describe("аудит прав @everyone в отчёте Apply (завершение проверки прав каналов)", () => {
  function everyoneStep(outcome: {
    readonly steps: readonly {
      readonly label: string;
      readonly status: string;
      readonly detail: string;
    }[];
  }) {
    return outcome.steps.find(
      (step) => step.label === "Проверка роли @everyone",
    );
  }

  it("типичные thread-права @everyone — шаг warning про read-only, применение продолжается", async () => {
    const fake = new FakeDiscordApi(); // everyonePermissions = typicalEveryoneBits
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied");
    const step = everyoneStep(outcome);
    expect(step?.status).toBe("warning");
    expect(step?.detail).toContain("read-only каналы");
    expect(step?.detail).toContain("вручную");
    // Предупреждение носит информационный характер: создание продолжено.
    expect(fake.createdChannels).toHaveLength(8);
    expect(fake.sentMessages).toHaveLength(6);
  });

  it("нет Send Messages in Threads у @everyone — предупреждение об ответах в форумах", async () => {
    const fake = new FakeDiscordApi({
      everyonePermissions:
        typicalEveryoneBits() & ~PermissionFlagsBits.SendMessagesInThreads,
    });
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied");
    const step = everyoneStep(outcome);
    expect(step?.status).toBe("warning");
    expect(step?.detail).toContain("Send Messages in Threads");
  });

  it("dry-run отражает те же предупреждения через plan.warnings, без мутаций", async () => {
    const fake = new FakeDiscordApi();
    const plan = await runDryRun(fake);

    expect(fake.mutations).toBe(0);
    expect(plan.warnings.some((w) => w.includes("read-only каналы"))).toBe(
      true,
    );
  });

  it("при недостаточных правах бота шаг аудита не выполняется", async () => {
    const fake = new FakeDiscordApi({
      permissionsBitfield: PermissionFlagsBits.ViewChannel,
    });
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("permission-denied");
    expect(everyoneStep(outcome)).toBeUndefined();
  });
});

describe("STAFF зависит от роли Moderator (FIX-2)", () => {
  function staffCategory(fake: FakeDiscordApi) {
    return fake.createdCategoryRecords.find(
      (c) => c.input.categoryKey === "staff",
    );
  }

  it("Moderator создан и доступен — STAFF и mod-log создаются с его оверрайтом", async () => {
    const fake = new FakeDiscordApi();
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied");
    const moderatorId = fake.roles.find(
      (role) => role.name === "Moderator",
    )?.id;
    expect(moderatorId).toBeDefined();

    const staff = staffCategory(fake);
    expect(staff).toBeDefined();
    const moderatorOverwrite = staff?.input.overwrites.find(
      (o) => o.id === moderatorId,
    );
    expect(moderatorOverwrite?.allow.length).toBeGreaterThan(0);

    const modLog = fake.createdChannels.find((c) => c.channelKey === "mod-log");
    expect(modLog).toBeDefined();
    expect(modLog?.overwrites.some((o) => o.id === moderatorId)).toBe(true);
  });

  it("Moderator уже существует и доступен — STAFF создаётся с существующей ролью", async () => {
    const fake = new FakeDiscordApi();
    fake.roles.push({ id: "900000000000000111", name: "Moderator" });

    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied");
    expect(fake.createdRoles.map((role) => role.name)).not.toContain(
      "Moderator",
    );
    const staff = staffCategory(fake);
    expect(staff).toBeDefined();
    expect(
      staff?.input.overwrites.some((o) => o.id === "900000000000000111"),
    ).toBe(true);
  });

  it("Moderator выше роли бота — STAFF и mod-log заблокированы, статус не 'applied'", async () => {
    const fake = new FakeDiscordApi({ rolesManageable: false });
    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied-with-errors");
    expect(staffCategory(fake)).toBeUndefined();
    expect(fake.createdChannels.map((c) => c.channelKey)).not.toContain(
      "mod-log",
    );
    const blocked = outcome.steps.filter(
      (step) => step.label.includes("STAFF") || step.label.includes("mod-log"),
    );
    expect(blocked).toHaveLength(2);
    expect(blocked.every((step) => step.status === "failed")).toBe(true);
    expect(blocked[0]?.detail).toContain("иерархии");
    // Независимые шаги продолжили работу.
    expect(fake.createdChannels.map((c) => c.channelKey)).toContain("welcome");
  });

  it("ошибка создания Moderator — STAFF заблокирован, остальные шаги выполняются", async () => {
    const fake = new FakeDiscordApi();
    fake.failRoleKeys.add("moderator");

    const outcome = await runApply(fake, options(true));

    expect(outcome.status).toBe("applied-with-errors");
    expect(staffCategory(fake)).toBeUndefined();
    expect(fake.createdChannels.map((c) => c.channelKey)).not.toContain(
      "mod-log",
    );
    expect(fake.createdChannels.map((c) => c.channelKey)).toContain("general");
    expect(fake.sentMessages).toHaveLength(6);
    const staffStep = outcome.steps.find((step) =>
      step.label.includes("STAFF"),
    );
    expect(staffStep?.detail).toContain("Moderator");
  });

  it("повторный запуск после устранения проблемы создаёт только STAFF и mod-log", async () => {
    const fake = new FakeDiscordApi({ rolesManageable: false });
    await runApply(fake, options(true));
    expect(staffCategory(fake)).toBeUndefined();

    fake.rolesManageable = true;
    const mutationsBeforeResume = fake.mutations;
    const second = await runApply(fake, options(true));

    expect(second.status).toBe("applied");
    expect(
      fake.createdCategoryRecords.filter(
        (c) => c.input.categoryKey === "staff",
      ),
    ).toHaveLength(1);
    expect(
      fake.createdChannels.filter((c) => c.channelKey === "mod-log"),
    ).toHaveLength(1);
    expect(fake.mutations).toBe(mutationsBeforeResume + 2);
  });

  it("существующий STAFF не изменяется, но при недоступном Moderator даёт предупреждение", async () => {
    const fake = new FakeDiscordApi({ rolesManageable: false });
    const state = fullExistingState();
    fake.channels = [...state.channels];
    fake.roles = [...state.roles];

    const outcome = await runApply(fake, options(true));

    expect(fake.createdCategoryRecords).toHaveLength(0);
    expect(fake.createdChannels).toHaveLength(0);
    const staffStep = outcome.steps.find((step) =>
      step.label.includes("STAFF"),
    );
    expect(staffStep?.status).toBe("warning");
    expect(staffStep?.detail).toContain("вручную");
  });
});
