import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import {
  applyEveryoneOverwrites,
  BOT_GRANTABLE_PERMISSIONS,
  categoryOverwrites,
  channelOverwrites,
  forumAccessWarnings,
  missingBotPermissions,
  permissionNames,
  plannedEveryoneEffect,
  readOnlyAccessWarnings,
  ROLE_PERMISSION_BITS,
  REQUIRED_BOT_PERMISSIONS,
  staffVisibilityWarning,
  type PermissionTargets,
  type SnapshotOverwrite,
} from "../src/permissions.js";
import { findChannel, TARGET_CONFIG } from "../src/config.js";
import {
  allRequiredBotBits,
  BOT_USER_ID,
  GUILD_ID,
  typicalEveryoneBits,
} from "./helpers.js";

const targets: PermissionTargets = {
  everyoneRoleId: GUILD_ID,
  roleIdByKey: { moderator: "900000000000000001" },
  botUserId: BOT_USER_ID,
};

/** All overwrite allow/deny sets across the target layout. */
function allOverwrites(): {
  allow: readonly bigint[];
  deny: readonly bigint[];
}[] {
  const result: { allow: readonly bigint[]; deny: readonly bigint[] }[] = [];
  for (const category of TARGET_CONFIG.categories) {
    result.push(...categoryOverwrites(category, targets));
    for (const channel of category.channels) {
      result.push(...channelOverwrites(channel, targets));
    }
  }
  return result;
}

describe("приватность STAFF (сценарий 6)", () => {
  it("категория STAFF полностью скрывает @everyone и открывает доступ только персоналу", () => {
    const staff = TARGET_CONFIG.categories.find(
      (category) => category.key === "staff",
    );
    expect(staff).toBeDefined();
    const overwrites = categoryOverwrites(staff!, targets);

    const everyone = overwrites.find((o) => o.id === GUILD_ID);
    expect(everyone?.deny).toContain(PermissionFlagsBits.ViewChannel);

    const ids = overwrites.map((o) => o.id);
    expect(ids).toEqual(
      expect.arrayContaining([GUILD_ID, "900000000000000001", BOT_USER_ID]),
    );
    // Никто, кроме модератора и бота, не получает доступ.
    expect(ids).toHaveLength(3);
    expect(everyone?.allow).toHaveLength(0);
  });

  it("канал mod-log повторяет приватные разрешения категории", () => {
    const modLog = findChannel("mod-log");
    expect(modLog).toBeDefined();
    const overwrites = channelOverwrites(modLog!, targets);

    const everyone = overwrites.find((o) => o.id === GUILD_ID);
    expect(everyone?.deny).toContain(PermissionFlagsBits.ViewChannel);
    expect(everyone?.allow).toHaveLength(0);

    const moderator = overwrites.find((o) => o.id === "900000000000000001");
    expect(moderator?.allow).toContain(PermissionFlagsBits.ViewChannel);
    expect(moderator?.allow).toContain(PermissionFlagsBits.SendMessages);
  });

  it("публичные категории не содержат deny для @everyone", () => {
    for (const category of TARGET_CONFIG.categories.filter(
      (category) => !category.staffOnly,
    )) {
      const overwrites = categoryOverwrites(category, targets);
      for (const overwrite of overwrites) {
        expect(overwrite.deny).not.toContain(PermissionFlagsBits.ViewChannel);
      }
    }
  });
});

describe("read-only каналы (сценарий 7)", () => {
  it("в welcome, rules и announcements @everyone не может отправлять сообщения", () => {
    for (const key of ["welcome", "rules", "announcements"]) {
      const channel = findChannel(key);
      expect(channel).toBeDefined();
      const overwrites = channelOverwrites(channel!, targets);

      const everyone = overwrites.find((o) => o.id === GUILD_ID);
      expect(everyone?.deny).toContain(PermissionFlagsBits.SendMessages);
      expect(everyone?.allow).toContain(PermissionFlagsBits.ViewChannel);
      expect(everyone?.allow).toContain(PermissionFlagsBits.ReadMessageHistory);
    }
  });

  it("в general @everyone может общаться", () => {
    const general = findChannel("general");
    expect(general).toBeDefined();
    const everyone = channelOverwrites(general!, targets).find(
      (o) => o.id === GUILD_ID,
    );

    expect(everyone?.allow).toContain(PermissionFlagsBits.SendMessages);
    expect(everyone?.deny).not.toContain(PermissionFlagsBits.SendMessages);
  });

  it("в форумах отправка не запрещена; посты и ответы не переопределяются оверрайтами", () => {
    for (const key of ["fj-support", "book-creator", "talentforge-support"]) {
      const channel = findChannel(key);
      expect(channel).toBeDefined();
      const everyone = channelOverwrites(channel!, targets).find(
        (o) => o.id === GUILD_ID,
      );

      expect(everyone?.allow).toContain(PermissionFlagsBits.SendMessages);
      expect(everyone?.deny).not.toContain(PermissionFlagsBits.SendMessages);
      // По документации Discord создание поста в форуме регулируется
      // SendMessages (CREATE_PUBLIC_THREADS игнорируется), ответ в треде —
      // SendMessagesInThreads. Оба права вне шести прав бота: бот не может
      // ни выдать, ни запретить их оверрайтом, поэтому фактический доступ
      // @everyone проверяется канальным аудитом (effective-access audit).
      expect(everyone?.allow).not.toContain(
        PermissionFlagsBits.CreatePublicThreads,
      );
      expect(everyone?.deny).not.toContain(
        PermissionFlagsBits.CreatePublicThreads,
      );
      expect(everyone?.deny).not.toContain(
        PermissionFlagsBits.SendMessagesInThreads,
      );
    }
  });
});

describe("эффективные права @everyone в канале (channel-specific allow/deny)", () => {
  function overwrite(
    id: string,
    allow: readonly bigint[] = [],
    deny: readonly bigint[] = [],
  ): SnapshotOverwrite {
    return {
      id,
      allow: allow.reduce((acc, bit) => acc | bit, 0n),
      deny: deny.reduce((acc, bit) => acc | bit, 0n),
    };
  }

  it("канальный deny снимает право, разрешённое глобально", () => {
    const effective = applyEveryoneOverwrites(
      typicalEveryoneBits(),
      [overwrite(GUILD_ID, [], [PermissionFlagsBits.SendMessages])],
      GUILD_ID,
    );
    expect(
      (effective & PermissionFlagsBits.SendMessages) ===
        PermissionFlagsBits.SendMessages,
    ).toBe(false);
  });

  it("канальный allow выдаёт право, отключённое глобально", () => {
    const effective = applyEveryoneOverwrites(
      typicalEveryoneBits() & ~PermissionFlagsBits.SendMessages,
      [overwrite(GUILD_ID, [PermissionFlagsBits.SendMessages])],
      GUILD_ID,
    );
    expect(
      (effective & PermissionFlagsBits.SendMessages) ===
        PermissionFlagsBits.SendMessages,
    ).toBe(true);
  });

  it("несколько оверрайтов @everyone применяются последовательно", () => {
    const effective = applyEveryoneOverwrites(
      typicalEveryoneBits(),
      [
        overwrite(
          GUILD_ID,
          [],
          [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.CreatePublicThreads,
          ],
        ),
        overwrite(GUILD_ID, [PermissionFlagsBits.SendMessages]),
      ],
      GUILD_ID,
    );
    expect(
      (effective & PermissionFlagsBits.SendMessages) ===
        PermissionFlagsBits.SendMessages,
    ).toBe(true);
    expect(
      (effective & PermissionFlagsBits.CreatePublicThreads) ===
        PermissionFlagsBits.CreatePublicThreads,
    ).toBe(false);
  });

  it("оврайты других ролей и участников не влияют на @everyone", () => {
    const effective = applyEveryoneOverwrites(
      typicalEveryoneBits(),
      [
        overwrite("900000000000000111", [PermissionFlagsBits.Administrator]),
        overwrite(BOT_USER_ID, [PermissionFlagsBits.Administrator]),
      ],
      GUILD_ID,
    );
    expect((effective & PermissionFlagsBits.Administrator) === 0n).toBe(true);
  });
});

describe("прогноз прав после создания канала (plannedEveryoneEffect)", () => {
  it("read-only: Send Messages закрыт, thread-права нетронуты", () => {
    const effective = plannedEveryoneEffect(typicalEveryoneBits(), "readOnly");
    expect(
      (effective & PermissionFlagsBits.SendMessages) ===
        PermissionFlagsBits.SendMessages,
    ).toBe(false);
    expect(
      (effective & PermissionFlagsBits.SendMessagesInThreads) ===
        PermissionFlagsBits.SendMessagesInThreads,
    ).toBe(true);
  });

  it("forum: Send Messages выдан allow-ом даже без глобального права", () => {
    const effective = plannedEveryoneEffect(
      typicalEveryoneBits() & ~PermissionFlagsBits.SendMessages,
      "forum",
    );
    expect(
      (effective & PermissionFlagsBits.SendMessages) ===
        PermissionFlagsBits.SendMessages,
    ).toBe(true);
  });

  it("staff: View Channel закрыт; talk: отправка доступна", () => {
    expect(
      (plannedEveryoneEffect(typicalEveryoneBits(), "staff") &
        PermissionFlagsBits.ViewChannel) ===
        PermissionFlagsBits.ViewChannel,
    ).toBe(false);
    expect(
      (plannedEveryoneEffect(0n, "talk") & PermissionFlagsBits.SendMessages) ===
        PermissionFlagsBits.SendMessages,
    ).toBe(true);
  });
});

describe("предупреждения аудита каналов", () => {
  const lockedReadOnly =
    plannedEveryoneEffect(typicalEveryoneBits(), "readOnly") &
    ~PermissionFlagsBits.CreatePublicThreads &
    ~PermissionFlagsBits.CreatePrivateThreads &
    ~PermissionFlagsBits.SendMessagesInThreads;

  it("read-only полностью закрыт — предупреждений нет (ручной шаг выполнен)", () => {
    expect(readOnlyAccessWarnings("welcome", lockedReadOnly)).toEqual([]);
  });

  it("read-only с Send Messages — предупреждение про отправку", () => {
    const warnings = readOnlyAccessWarnings("welcome", typicalEveryoneBits());
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("отправлять сообщения");
    expect(warnings[0]).toContain("thread-права");
  });

  it("read-only только с thread-правами — предупреждение перечисляет их имена", () => {
    const onlyThreads =
      lockedReadOnly | PermissionFlagsBits.CreatePublicThreads;
    const warnings = readOnlyAccessWarnings("rules", onlyThreads);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Create Public Threads");
    expect(warnings[0]).not.toContain("отправлять сообщения");
  });

  it("форум с полным доступом — предупреждений нет", () => {
    expect(forumAccessWarnings("fj-support", typicalEveryoneBits())).toEqual(
      [],
    );
  });

  it("форум без Send Messages — посты; без Send Messages in Threads — ответы", () => {
    const noSend = typicalEveryoneBits() & ~PermissionFlagsBits.SendMessages;
    expect(forumAccessWarnings("fj-support", noSend)[0]).toContain(
      "создавать посты",
    );

    const noThreadReplies =
      typicalEveryoneBits() & ~PermissionFlagsBits.SendMessagesInThreads;
    expect(forumAccessWarnings("book-creator", noThreadReplies)[0]).toContain(
      "отвечать",
    );
  });

  it("видимый STAFF — предупреждение-риск; скрытый — null", () => {
    const risk = staffVisibilityWarning(
      "Канал #mod-log",
      typicalEveryoneBits(),
    );
    expect(risk).toContain("View Channel");
    // View Channel отсутствует — канал для @everyone невидим, риска нет.
    expect(
      staffVisibilityWarning(
        "Канал #mod-log",
        PermissionFlagsBits.SendMessages,
      ),
    ).toBeNull();
  });

  it("Administrator у @everyone покрывает все проверки (семантика Discord)", () => {
    expect(
      readOnlyAccessWarnings("welcome", PermissionFlagsBits.Administrator),
    ).toHaveLength(1);
    expect(
      forumAccessWarnings("fj-support", PermissionFlagsBits.Administrator),
    ).toEqual([]);
  });
});

describe("минимальные привилегии и гранты в пределах прав бота", () => {
  it("ни одна роль не получает Administrator или управление сервером", () => {
    for (const bits of Object.values(ROLE_PERMISSION_BITS)) {
      expect(bits).not.toContain(PermissionFlagsBits.Administrator);
      expect(bits).not.toContain(PermissionFlagsBits.ManageChannels);
      expect(bits).not.toContain(PermissionFlagsBits.ManageRoles);
      expect(bits).not.toContain(PermissionFlagsBits.ManageGuild);
      expect(bits).not.toContain(PermissionFlagsBits.ManageWebhooks);
    }
  });

  it("автоматические гранты ролей не выходят за шесть документированных прав бота", () => {
    const grantable = allRequiredBotBits();
    for (const [roleKey, bits] of Object.entries(ROLE_PERMISSION_BITS)) {
      for (const bit of bits) {
        expect(
          (bit & grantable) === bit,
          `${roleKey}: ${permissionNames([bit])[0]} вне прав бота`,
        ).toBe(true);
      }
    }
  });

  it("глобальные модераторские права не назначаются автоматически (ручной шаг владельца)", () => {
    const moderator = ROLE_PERMISSION_BITS["moderator"];
    expect(moderator).not.toContain(PermissionFlagsBits.KickMembers);
    expect(moderator).not.toContain(PermissionFlagsBits.BanMembers);
    expect(moderator).not.toContain(PermissionFlagsBits.ModerateMembers);
    expect(moderator).not.toContain(PermissionFlagsBits.ManageMessages);
    expect(moderator).not.toContain(PermissionFlagsBits.ManageThreads);
    expect(moderator).not.toContain(PermissionFlagsBits.ViewAuditLog);
  });

  it("все оверрайты (allow и deny) остаются в пределах прав бота", () => {
    const grantable = allRequiredBotBits();
    for (const overwrite of allOverwrites()) {
      for (const bit of [...overwrite.allow, ...overwrite.deny]) {
        expect(
          (bit & grantable) === bit,
          `${permissionNames([bit])[0]} вне прав бота`,
        ).toBe(true);
      }
    }
  });

  it("BOT_GRANTABLE_PERMISSIONS совпадает с шестью правами документированного invite", () => {
    expect(BOT_GRANTABLE_PERMISSIONS).toHaveLength(
      REQUIRED_BOT_PERMISSIONS.length,
    );
    expect(missingBotPermissions(allRequiredBotBits())).toHaveLength(0);
  });

  it("боту не требуется Administrator", () => {
    expect(REQUIRED_BOT_PERMISSIONS).not.toContain("Administrator");
    expect(missingBotPermissions(0n)).toEqual([
      "ViewChannel",
      "SendMessages",
      "EmbedLinks",
      "ReadMessageHistory",
      "ManageChannels",
      "ManageRoles",
    ]);
  });

  it("Administrator у бота закрывает все требования (семантика Discord)", () => {
    expect(
      missingBotPermissions(PermissionFlagsBits.Administrator),
    ).toHaveLength(0);
  });

  it("permissionNames отражает флаги понятными именами", () => {
    expect(
      permissionNames([
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ViewChannel,
      ]),
    ).toEqual(["ViewChannel", "ManageMessages"]);
  });
});
