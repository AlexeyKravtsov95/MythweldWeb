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
  [PermissionFlagsBits.CreatePrivateThreads, "CreatePrivateThreads"],
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

/**
 * Channel/category permission overwrite as captured in the guild snapshot.
 * Used to compute the *effective* @everyone access per entity — the guild
 * -wide bitfield alone is never treated as proof of actual channel access.
 */
export interface SnapshotOverwrite {
  /** Role or member snowflake the overwrite applies to. */
  readonly id: string;
  readonly allow: bigint;
  readonly deny: bigint;
}

/**
 * Effective @everyone permissions in a channel (or a category audited on
 * its own): the guild-wide role bitfield with that entity's OWN overwrites
 * applied. Discord resolves channel access exactly this way — parent
 * categories do not participate at runtime. Permission syncing is a copy:
 * a synced channel simply carries the same overwrites as its category,
 * while an unsynced one may differ, so each entity is always audited by
 * its own overwrites only. Overwrites targeting other roles or members
 * are ignored here.
 */
export function applyEveryoneOverwrites(
  base: bigint,
  overwrites: readonly SnapshotOverwrite[],
  everyoneRoleId: string,
): bigint {
  let effective = base;
  for (const overwrite of overwrites) {
    if (overwrite.id !== everyoneRoleId) {
      continue;
    }
    effective = (effective & ~overwrite.deny) | overwrite.allow;
  }
  return effective;
}

/** The @everyone overwrite shapes the bootstrap itself would create. */
export type EveryoneOverwriteKind = "readOnly" | "forum" | "talk" | "staff";

/**
 * Predicted effective @everyone permissions right after the bootstrap
 * creates the channel: the guild-wide bitfield with EXACTLY the channel
 * overwrites the executor sends to Discord (categories are created with
 * their own overwrites and never participate in a channel's runtime
 * permissions). No assumption beyond what the tool itself guarantees.
 */
export function plannedEveryoneEffect(
  base: bigint,
  kind: EveryoneOverwriteKind,
): bigint {
  let effective = base;
  const planned =
    kind === "readOnly"
      ? { allow: READ_ONLY_EVERYONE_ALLOW, deny: READ_ONLY_EVERYONE_DENY }
      : kind === "forum"
        ? { allow: FORUM_EVERYONE_ALLOW, deny: [] }
        : kind === "staff"
          ? { allow: [], deny: STAFF_EVERYONE_DENY }
          : { allow: TALK_EVERYONE_ALLOW, deny: [] };
  for (const bit of planned.deny) {
    effective &= ~bit;
  }
  for (const bit of planned.allow) {
    effective |= bit;
  }
  return effective;
}

const THREAD_RIGHTS: ReadonlyArray<readonly [bigint, string]> = [
  [PermissionFlagsBits.CreatePublicThreads, "Create Public Threads"],
  [PermissionFlagsBits.CreatePrivateThreads, "Create Private Threads"],
  [PermissionFlagsBits.SendMessagesInThreads, "Send Messages in Threads"],
];

/**
 * Read-only channel audit against the *effective* @everyone access.
 * Returns an empty list when the channel is already fully locked (Send
 * Messages denied and no thread rights left) — after the owner completes
 * the manual thread-permission step the warning disappears instead of
 * lingering as a generic reminder.
 */
export function readOnlyAccessWarnings(
  channelName: string,
  effective: bigint,
): readonly string[] {
  const gaps: string[] = [];
  if (hasPermission(effective, PermissionFlagsBits.SendMessages)) {
    gaps.push("может отправлять сообщения (Send Messages)");
  }
  const threadRights = THREAD_RIGHTS.filter(([bit]) =>
    hasPermission(effective, bit),
  ).map(([, label]) => label);
  if (threadRights.length > 0) {
    gaps.push(`сохраняет thread-права: ${threadRights.join(", ")}`);
  }
  if (gaps.length === 0) {
    return [];
  }
  return [
    `Канал "${channelName}" (read-only): @everyone фактически ${gaps.join("; ")} — ` +
      "бот не может закрыть эти права автоматически (оврайты ограничены шестью правами бота); " +
      "закройте их для @everyone вручную",
  ];
}

/**
 * Forum audit against the effective @everyone access: creating a post needs
 * SEND_MESSAGES (docs: CREATE_PUBLIC_THREADS is ignored for forum posts),
 * replying needs SEND_MESSAGES_IN_THREADS.
 */
export function forumAccessWarnings(
  channelName: string,
  effective: bigint,
): readonly string[] {
  const warnings: string[] = [];
  if (!hasPermission(effective, PermissionFlagsBits.SendMessages)) {
    warnings.push(
      `Форум "${channelName}": @everyone не сможет создавать посты — Send Messages закрыт; ` +
        "включите право для @everyone вручную",
    );
  }
  if (!hasPermission(effective, PermissionFlagsBits.SendMessagesInThreads)) {
    warnings.push(
      `Форум "${channelName}": @everyone не сможет отвечать в постах — Send Messages in Threads закрыт; ` +
        "включите право для @everyone вручную",
    );
  }
  return warnings;
}

/**
 * STAFF visibility risk: an existing staff-only category/channel where
 * @everyone still has View Channel is reported explicitly. Categories and
 * channels are audited independently against their OWN overwrites — a
 * hidden category does not hide an unsynced channel inside it, and vice
 * versa. Existing permissions are never modified automatically; the owner
 * fixes access manually.
 */
export function staffVisibilityWarning(
  entityLabel: string,
  effective: bigint,
): string | null {
  if (!hasPermission(effective, PermissionFlagsBits.ViewChannel)) {
    return null;
  }
  return (
    `${entityLabel} виден(а) обычным участникам (@everyone имеет View Channel) — ` +
    "публичный доступ к приватной зоне STAFF; закройте View Channel для @everyone вручную. " +
    "Существующие разрешения инструмент не меняет"
  );
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
// per the Discord API docs, a bot can only allow/deny permissions it has
// itself ("Only permissions your bot has in the guild or parent channel
// (if applicable) can be allowed/denied"). Thread permissions
// (CreatePublicThreads/CreatePrivateThreads/SendMessagesInThreads) are
// outside the bot's six invite permissions, so read-only channels deny
// SendMessages only, and residual thread rights of @everyone are flagged
// by auditEveryonePermissions as a manual owner step (README).
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
// Forum posting is governed by SendMessages (the docs state
// CREATE_PUBLIC_THREADS is ignored when creating forum posts) and replying
// by SendMessagesInThreads. Neither can be granted or denied by this bot,
// so the actual @everyone defaults are audited at runtime instead.
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
