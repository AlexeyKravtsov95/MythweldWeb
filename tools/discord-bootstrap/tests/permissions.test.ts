import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import {
  categoryOverwrites,
  channelOverwrites,
  missingBotPermissions,
  permissionNames,
  ROLE_PERMISSION_BITS,
  REQUIRED_BOT_PERMISSIONS,
  type PermissionTargets,
} from "../src/permissions.js";
import { findChannel, TARGET_CONFIG } from "../src/config.js";
import { allRequiredBotBits, BOT_USER_ID, GUILD_ID } from "./helpers.js";

const targets: PermissionTargets = {
  everyoneRoleId: GUILD_ID,
  roleIdByKey: { moderator: "900000000000000001" },
  botUserId: BOT_USER_ID,
};

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
    expect(moderator?.allow).toContain(PermissionFlagsBits.ManageMessages);
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
      expect(everyone?.deny).toContain(
        PermissionFlagsBits.SendMessagesInThreads,
      );
      expect(everyone?.deny).toContain(PermissionFlagsBits.CreatePublicThreads);
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

  it("в форумах @everyone может создавать темы и отвечать", () => {
    for (const key of ["fj-support", "book-creator", "talentforge-support"]) {
      const channel = findChannel(key);
      expect(channel).toBeDefined();
      const everyone = channelOverwrites(channel!, targets).find(
        (o) => o.id === GUILD_ID,
      );

      expect(everyone?.allow).toContain(PermissionFlagsBits.SendMessages);
      expect(everyone?.allow).toContain(
        PermissionFlagsBits.SendMessagesInThreads,
      );
      expect(everyone?.allow).toContain(
        PermissionFlagsBits.CreatePublicThreads,
      );
      expect(everyone?.deny).not.toContain(PermissionFlagsBits.SendMessages);
    }
  });
});

describe("минимальные привилегии", () => {
  it("ни одна роль не получает Administrator или управление сервером", () => {
    for (const bits of Object.values(ROLE_PERMISSION_BITS)) {
      expect(bits).not.toContain(PermissionFlagsBits.Administrator);
      expect(bits).not.toContain(PermissionFlagsBits.ManageChannels);
      expect(bits).not.toContain(PermissionFlagsBits.ManageRoles);
      expect(bits).not.toContain(PermissionFlagsBits.ManageGuild);
      expect(bits).not.toContain(PermissionFlagsBits.ManageWebhooks);
    }
  });

  it("модератор получает права модерирования, developer — нет", () => {
    const moderator = ROLE_PERMISSION_BITS["moderator"];
    const developer = ROLE_PERMISSION_BITS["developer"];

    expect(moderator).toContain(PermissionFlagsBits.ManageMessages);
    expect(moderator).toContain(PermissionFlagsBits.ModerateMembers);
    expect(moderator).toContain(PermissionFlagsBits.KickMembers);
    expect(moderator).toContain(PermissionFlagsBits.BanMembers);

    expect(developer).not.toContain(PermissionFlagsBits.ManageMessages);
    expect(developer).not.toContain(PermissionFlagsBits.ModerateMembers);
    expect(developer).not.toContain(PermissionFlagsBits.KickMembers);
    expect(developer).not.toContain(PermissionFlagsBits.BanMembers);
  });

  it("боту не требуется Administrator", () => {
    expect(REQUIRED_BOT_PERMISSIONS).not.toContain("Administrator");
    expect(missingBotPermissions(allRequiredBotBits())).toHaveLength(0);
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
