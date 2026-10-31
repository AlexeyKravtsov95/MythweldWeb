import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import { runApply, runDryRun, type ApplyOptions } from "../src/executor.js";
import { FakeDiscordApi, fullExistingState } from "./helpers.js";

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
