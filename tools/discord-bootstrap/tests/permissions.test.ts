import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import {
  auditEveryonePermissions,
  BOT_GRANTABLE_PERMISSIONS,
  categoryOverwrites,
  channelOverwrites,
  missingBotPermissions,
  permissionNames,
  ROLE_PERMISSION_BITS,
  REQUIRED_BOT_PERMISSIONS,
  type PermissionTargets,
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
      // ни выдать, ни запретить их оверрайтом, поэтому фактические права
      // @everyone проверяются отдельным аудитом (auditEveryonePermissions).
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

describe("аудит фактических прав @everyone (read-only треды и форумы)", () => {
  it("типичный @everyone: предупреждение о read-only тредах, которые бот не может запретить", () => {
    const warnings = auditEveryonePermissions(typicalEveryoneBits());

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("read-only каналы");
    expect(warnings[0]).toContain("Create Public Threads");
    expect(warnings[0]).toContain("Send Messages in Threads");
  });

  it("нет Send Messages — предупреждение о постах форумов и #general", () => {
    const warnings = auditEveryonePermissions(
      typicalEveryoneBits() & ~PermissionFlagsBits.SendMessages,
    );

    expect(
      warnings.some((warning) => warning.includes("отключено Send Messages")),
    ).toBe(true);
    expect(warnings.some((warning) => warning.includes("#general"))).toBe(true);
  });

  it("нет Send Messages in Threads — предупреждение об ответах в форумах", () => {
    const warnings = auditEveryonePermissions(
      typicalEveryoneBits() & ~PermissionFlagsBits.SendMessagesInThreads,
    );

    expect(
      warnings.some((warning) =>
        warning.includes("отключено Send Messages in Threads"),
      ),
    ).toBe(true);
    // Thread-права всё ещё есть (CreatePublic/CreatePrivate) — read-only
    // примечание остаётся.
    expect(
      warnings.some((warning) => warning.includes("read-only каналы")),
    ).toBe(true);
  });

  it("thread-прав полностью нет — read-only примечание не выводится", () => {
    const conservative =
      PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages;
    const warnings = auditEveryonePermissions(conservative);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Send Messages in Threads");
    expect(warnings[0]).not.toContain("read-only каналы");
  });

  it("Administrator у @everyone покрывает все права (семантика Discord)", () => {
    expect(auditEveryonePermissions(PermissionFlagsBits.Administrator)).toEqual(
      [expect.stringContaining("read-only каналы")],
    );
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
