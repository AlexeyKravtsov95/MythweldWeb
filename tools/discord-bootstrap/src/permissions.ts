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

/**
 * Exactly the six permissions of the documented OAuth2 invite.
 *
 * Discord refuses to create roles or channel overwrites that grant
 * permissions the bot itself does not have, so every automatic grant
 * (role permissions and overwrite allow/deny sets below) must stay
 * within this set. Anything beyond it is a manual owner step (README).
 */
export const BOT_GRANTABLE_PERMISSIONS: readonly bigint[] = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
];

/** True when every bit of `bits` is present in `bitfield` (Administrator wins). */
export function bitsWithin(bitfield: bigint, bits: readonly bigint[]): boolean {
  return bits.every((bit) => hasPermission(bitfield, bit));
}

/**
 * Automatic role grants. Deliberately limited to the safe subset the
 * bootstrap bot can grant (subset of BOT_GRANTABLE_PERMISSIONS): Discord
 * rejects roles with permissions the bot lacks. Global moderation powers
 * for Moderator (Kick/Ban/Timeout/ManageMessages/…) stay a manual owner
 * step — see README.
 */
export const ROLE_PERMISSION_BITS: Readonly<
  Record<RoleKey, readonly bigint[]>
> = {
  moderator: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
  ],
  developer: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
  ],
  member: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
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

// Every allow/deny below must stay within BOT_GRANTABLE_PERMISSIONS:
// Discord rejects overwrites that touch permissions the bot lacks.
// Forum extras (threads, reactions) are not re-granted explicitly —
// @everyone already has them by default on a fresh server.
const READ_ONLY_EVERYONE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
];
const READ_ONLY_EVERYONE_DENY = [PermissionFlagsBits.SendMessages];
const TALK_EVERYONE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];
const FORUM_EVERYONE_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.SendMessages,
];
const STAFF_EVERYONE_DENY = [PermissionFlagsBits.ViewChannel];
const STAFF_MODERATOR_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.EmbedLinks,
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
    { id: targets.botUserId, allow: [...BOT_MESSAGE_ALLOW], deny: [] },
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
