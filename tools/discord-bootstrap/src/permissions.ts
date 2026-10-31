/**
 * Permission matrices: bot requirements, role grants and permission
 * overwrites for categories and channels. All functions are pure so the
 * least-privilege rules can be unit tested without Discord.
 */
import { PermissionFlagsBits } from "discord.js";
import type {
  CategoryDefinition,
  ChannelDefinition,
  RoleKey,
} from "./config.js";

/**
 * Server-level permissions the bot needs. No Administrator and no
 * Message Content intent: reading guild structure, creating channels and
 * roles, and sending its own startup messages only.
 */
export const REQUIRED_BOT_PERMISSIONS = [
  "ViewChannel",
  "SendMessages",
  "EmbedLinks",
  "ReadMessageHistory",
  "ManageChannels",
  "ManageRoles",
] as const;

export type BotPermissionName = (typeof REQUIRED_BOT_PERMISSIONS)[number];

const BOT_PERMISSION_BITS: Readonly<Record<BotPermissionName, bigint>> = {
  ViewChannel: PermissionFlagsBits.ViewChannel,
  SendMessages: PermissionFlagsBits.SendMessages,
  EmbedLinks: PermissionFlagsBits.EmbedLinks,
  ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ManageRoles: PermissionFlagsBits.ManageRoles,
};

/** Discord semantics: Administrator implies every other permission. */
export function hasPermission(bitfield: bigint, flag: bigint): boolean {
  if (
    (bitfield & PermissionFlagsBits.Administrator) ===
    PermissionFlagsBits.Administrator
  ) {
    return true;
  }
  return (bitfield & flag) === flag;
}

export function missingBotPermissions(
  bitfield: bigint,
): readonly BotPermissionName[] {
  return REQUIRED_BOT_PERMISSIONS.filter(
    (name) => !hasPermission(bitfield, BOT_PERMISSION_BITS[name]),
  );
}

/** Least-privilege role grants; none of them includes Administrator. */
export const ROLE_PERMISSION_BITS: Readonly<
  Record<RoleKey, readonly bigint[]>
> = {
  moderator: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.ViewAuditLog,
  ],
  developer: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseExternalEmojis,
  ],
  member: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseExternalEmojis,
  ],
};

export function rolePermissionsBitfield(key: RoleKey): bigint {
  return ROLE_PERMISSION_BITS[key].reduce((acc, bit) => acc | bit, 0n);
}

const PERMISSION_NAMES: ReadonlyArray<readonly [bigint, string]> = [
  [PermissionFlagsBits.Administrator, "Administrator"],
  [PermissionFlagsBits.ViewChannel, "ViewChannel"],
  [PermissionFlagsBits.SendMessages, "SendMessages"],
  [PermissionFlagsBits.EmbedLinks, "EmbedLinks"],
  [PermissionFlagsBits.ReadMessageHistory, "ReadMessageHistory"],
  [PermissionFlagsBits.ManageChannels, "ManageChannels"],
  [PermissionFlagsBits.ManageRoles, "ManageRoles"],
  [PermissionFlagsBits.AttachFiles, "AttachFiles"],
  [PermissionFlagsBits.AddReactions, "AddReactions"],
  [PermissionFlagsBits.UseExternalEmojis, "UseExternalEmojis"],
  [PermissionFlagsBits.KickMembers, "KickMembers"],
  [PermissionFlagsBits.BanMembers, "BanMembers"],
  [PermissionFlagsBits.ModerateMembers, "ModerateMembers"],
  [PermissionFlagsBits.ManageMessages, "ManageMessages"],
  [PermissionFlagsBits.ManageThreads, "ManageThreads"],
  [PermissionFlagsBits.ViewAuditLog, "ViewAuditLog"],
  [PermissionFlagsBits.CreatePublicThreads, "CreatePublicThreads"],
  [PermissionFlagsBits.SendMessagesInThreads, "SendMessagesInThreads"],
];

export function permissionNames(bits: readonly bigint[]): readonly string[] {
  const names: string[] = [];
  for (const [bit, name] of PERMISSION_NAMES) {
    if (bits.includes(bit)) {
      names.push(name);
    }
  }
  return names;
}

export interface OverwriteSpec {
  /** Role or user snowflake the overwrite applies to. */
  readonly id: string;
  readonly allow: readonly bigint[];
  readonly deny: readonly bigint[];
}

export interface PermissionTargets {
  readonly everyoneRoleId: string;
  readonly roleIdByKey: Readonly<Partial<Record<RoleKey, string>>>;
  readonly botUserId: string;
}

const READ_ONLY_EVERYONE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
];
const READ_ONLY_EVERYONE_DENY = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.SendMessagesInThreads,
];
const TALK_EVERYONE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];
const FORUM_EVERYONE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.AddReactions,
];
const STAFF_EVERYONE_DENY = [PermissionFlagsBits.ViewChannel];
const STAFF_MODERATOR_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageThreads,
];
const BOT_MESSAGE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.EmbedLinks,
];

/** Overwrites for a staff-only category or channel: hidden from @everyone. */
function staffOverwrites(targets: PermissionTargets): readonly OverwriteSpec[] {
  const overwrites: OverwriteSpec[] = [
    { id: targets.everyoneRoleId, allow: [], deny: [...STAFF_EVERYONE_DENY] },
    {
      id: targets.botUserId,
      allow: [...BOT_MESSAGE_ALLOW, PermissionFlagsBits.ManageMessages],
      deny: [],
    },
  ];
  const moderatorId = targets.roleIdByKey["moderator"];
  if (moderatorId !== undefined) {
    overwrites.push({
      id: moderatorId,
      allow: [...STAFF_MODERATOR_ALLOW],
      deny: [],
    });
  }
  return overwrites;
}

export function categoryOverwrites(
  category: CategoryDefinition,
  targets: PermissionTargets,
): readonly OverwriteSpec[] {
  if (category.staffOnly) {
    return staffOverwrites(targets);
  }
  const channels = category.channels;
  const allReadOnly =
    channels.length > 0 && channels.every((channel) => channel.readOnly);
  const hasForum = channels.some((channel) => channel.kind === "forum");
  if (allReadOnly) {
    return [
      {
        id: targets.everyoneRoleId,
        allow: [...READ_ONLY_EVERYONE_ALLOW],
        deny: [...READ_ONLY_EVERYONE_DENY],
      },
    ];
  }
  if (hasForum) {
    return [
      {
        id: targets.everyoneRoleId,
        allow: [...FORUM_EVERYONE_ALLOW],
        deny: [],
      },
    ];
  }
  return [
    { id: targets.everyoneRoleId, allow: [...TALK_EVERYONE_ALLOW], deny: [] },
  ];
}

export function channelOverwrites(
  channel: ChannelDefinition,
  targets: PermissionTargets,
): readonly OverwriteSpec[] {
  if (channel.staffOnly) {
    return staffOverwrites(targets);
  }
  if (channel.readOnly) {
    return [
      {
        id: targets.everyoneRoleId,
        allow: [...READ_ONLY_EVERYONE_ALLOW],
        deny: [...READ_ONLY_EVERYONE_DENY],
      },
      { id: targets.botUserId, allow: [...BOT_MESSAGE_ALLOW], deny: [] },
    ];
  }
  if (channel.kind === "forum") {
    return [
      {
        id: targets.everyoneRoleId,
        allow: [...FORUM_EVERYONE_ALLOW],
        deny: [],
      },
      { id: targets.botUserId, allow: [...BOT_MESSAGE_ALLOW], deny: [] },
    ];
  }
  return [
    { id: targets.everyoneRoleId, allow: [...TALK_EVERYONE_ALLOW], deny: [] },
    { id: targets.botUserId, allow: [...BOT_MESSAGE_ALLOW], deny: [] },
  ];
}
