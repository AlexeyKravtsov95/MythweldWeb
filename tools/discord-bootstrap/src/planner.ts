/**
 * Pure planning: compare the target configuration with a snapshot of the
 * guild and decide what to create, what already exists and what conflicts
 * require a manual decision. The planner never performs I/O.
 */
import type {
  CategoryDefinition,
  ChannelDefinition,
  ChannelKind,
  RoleKey,
  TargetConfig,
} from "./config.js";
import type { StartupMessageDefinition } from "./messages.js";
import {
  applyEveryoneOverwrites,
  forumAccessWarnings,
  plannedEveryoneEffect,
  readOnlyAccessWarnings,
  staffVisibilityWarning,
  type EveryoneOverwriteKind,
  type SnapshotOverwrite,
} from "./permissions.js";

export type SnapshotChannelType =
  "category" | "text" | "forum" | "voice" | "announcement" | "other";

export interface SnapshotChannel {
  readonly id: string;
  readonly name: string;
  readonly type: SnapshotChannelType;
  readonly parentId: string | null;
  /** Actual channel overwrites; used for the effective-access audit. */
  readonly permissionOverwrites: readonly SnapshotOverwrite[];
}

export interface SnapshotRole {
  readonly id: string;
  readonly name: string;
}

/** Result of probing a channel for an already published startup message. */
export type MessageProbe = "sent" | "absent" | "unknown";

export interface GuildSnapshot {
  /** Guild snowflake; doubles as the @everyone role id. */
  readonly guildId: string;
  /** Actual permission bitfield of the @everyone role (audited, not assumed). */
  readonly everyonePermissions: bigint;
  readonly channels: readonly SnapshotChannel[];
  readonly roles: readonly SnapshotRole[];
  readonly messageProbes: Readonly<Record<string, MessageProbe>>;
}

export type ConflictKind =
  | "category-name-taken-by-channel"
  | "channel-type-mismatch"
  | "channel-outside-target-category"
  | "channel-parent-category-conflict";

export interface PlanConflict {
  readonly kind: ConflictKind;
  readonly message: string;
}

export interface PlannedRole {
  readonly action: "create" | "exists";
  readonly roleKey: RoleKey;
  readonly name: string;
  readonly existingId: string | null;
}

export interface PlannedCategory {
  readonly action: "create" | "exists" | "conflict";
  readonly categoryKey: string;
  readonly name: string;
  readonly existingId: string | null;
  readonly conflict: PlanConflict | null;
}

export interface PlannedChannel {
  readonly action: "create" | "exists" | "conflict";
  readonly channelKey: string;
  readonly name: string;
  readonly kind: ChannelKind;
  readonly categoryKey: string;
  readonly existingId: string | null;
  readonly conflict: PlanConflict | null;
}

export interface PlannedMessage {
  readonly action: "send" | "skip" | "blocked";
  readonly channelKey: string;
  readonly channelKind: ChannelKind;
  readonly reason: string | null;
}

export interface BootstrapPlan {
  readonly roles: readonly PlannedRole[];
  readonly categories: readonly PlannedCategory[];
  readonly channels: readonly PlannedChannel[];
  readonly messages: readonly PlannedMessage[];
  readonly conflicts: readonly PlanConflict[];
  readonly warnings: readonly string[];
  /**
   * Effective-access audit: per-channel @everyone warnings computed from
   * the real channel/category overwrites (or the planned ones for channels
   * that will be created). Mirrored into `warnings` for dry-run output;
   * the executor surfaces it as a dedicated report step.
   */
  readonly accessAudit: readonly string[];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function expectedSnapshotType(kind: ChannelKind): SnapshotChannelType {
  return kind;
}

/**
 * Snapshot types an existing channel may have without a type conflict.
 * Every channel must match its configured kind exactly, with a single
 * exception: `#announcements` may already exist as a GuildAnnouncement
 * channel. Discord models announcement channels as text channels (same
 * history reads and embed sends), and the tool never converts or moves an
 * existing channel — so both types simply mean "already in place".
 */
export function acceptedSnapshotTypes(
  channel: ChannelDefinition,
): readonly SnapshotChannelType[] {
  if (channel.key === "announcements" && channel.kind === "text") {
    return ["text", "announcement"];
  }
  return [expectedSnapshotType(channel.kind)];
}

interface CategoryResolution {
  readonly definition: CategoryDefinition;
  readonly existing: SnapshotChannel | null;
  readonly nameClash: SnapshotChannel | null;
}

function resolveCategories(
  target: TargetConfig,
  snapshot: GuildSnapshot,
): Map<string, CategoryResolution> {
  const resolutions = new Map<string, CategoryResolution>();
  for (const category of target.categories) {
    const existing =
      snapshot.channels.find(
        (channel) =>
          channel.type === "category" &&
          normalizeName(channel.name) === normalizeName(category.name),
      ) ?? null;
    const nameClash =
      existing === null
        ? (snapshot.channels.find(
            (channel) =>
              channel.type !== "category" &&
              normalizeName(channel.name) === normalizeName(category.name),
          ) ?? null)
        : null;
    resolutions.set(category.key, {
      definition: category,
      existing,
      nameClash,
    });
  }
  return resolutions;
}

export function buildPlan(
  target: TargetConfig,
  messages: readonly StartupMessageDefinition[],
  snapshot: GuildSnapshot,
): BootstrapPlan {
  const conflicts: PlanConflict[] = [];
  const warnings: string[] = [];
  // Effective-access audit. Every existing channel/category is audited by
  // its OWN overwrites on top of the guild-wide @everyone bitfield —
  // Discord uses permission syncing (a copy), not runtime inheritance, so
  // a parent category never contributes to a channel's permissions.
  // Channels that will be created are audited against exactly the
  // overwrites the executor will send for them.
  const accessAudit: string[] = [];

  const roles: PlannedRole[] = target.roles.map((role) => {
    const existing =
      snapshot.roles.find(
        (candidate) =>
          normalizeName(candidate.name) === normalizeName(role.name),
      ) ?? null;
    if (existing !== null) {
      warnings.push(
        `Роль "${role.name}" уже существует — права роли автоматически не проверяются и не изменяются.`,
      );
      return {
        action: "exists",
        roleKey: role.key,
        name: role.name,
        existingId: existing.id,
      };
    }
    return {
      action: "create",
      roleKey: role.key,
      name: role.name,
      existingId: null,
    };
  });

  const categoryResolutions = resolveCategories(target, snapshot);

  const categories: PlannedCategory[] = target.categories.map((category) => {
    const resolution = categoryResolutions.get(category.key);
    if (resolution === undefined) {
      throw new Error(`No resolution for category ${category.key}`);
    }
    if (resolution.existing !== null) {
      if (category.staffOnly) {
        // The category is audited on its own overwrites: an existing
        // staff-only category that @everyone can still see is an explicit
        // privacy risk; never auto-fixed. (A hidden category does not hide
        // unsynced channels inside it — those are audited separately.)
        const effective = applyEveryoneOverwrites(
          snapshot.everyonePermissions,
          resolution.existing.permissionOverwrites,
          snapshot.guildId,
        );
        const risk = staffVisibilityWarning(
          `Категория "${category.name}" (STAFF)`,
          effective,
        );
        if (risk !== null) {
          accessAudit.push(risk);
        }
      }
      return {
        action: "exists",
        categoryKey: category.key,
        name: category.name,
        existingId: resolution.existing.id,
        conflict: null,
      };
    }
    if (resolution.nameClash !== null) {
      const conflict: PlanConflict = {
        kind: "category-name-taken-by-channel",
        message:
          `Категория "${category.name}" не может быть создана: имя занято каналом ` +
          `"${resolution.nameClash.name}" (${resolution.nameClash.type}). Разрешите конфликт вручную.`,
      };
      conflicts.push(conflict);
      return {
        action: "conflict",
        categoryKey: category.key,
        name: category.name,
        existingId: null,
        conflict,
      };
    }
    return {
      action: "create",
      categoryKey: category.key,
      name: category.name,
      existingId: null,
      conflict: null,
    };
  });

  const channels: PlannedChannel[] = [];
  for (const category of target.categories) {
    const resolution = categoryResolutions.get(category.key);
    if (resolution === undefined) {
      throw new Error(`No resolution for category ${category.key}`);
    }
    for (const channel of category.channels) {
      channels.push(
        planChannel(channel, resolution, snapshot, conflicts, accessAudit),
      );
    }
  }

  const channelByKey = new Map(
    channels.map((channel) => [channel.channelKey, channel]),
  );
  const plannedMessages: PlannedMessage[] = messages.map((message) => {
    const probe = snapshot.messageProbes[message.channelKey] ?? "absent";
    const channelPlan = channelByKey.get(message.channelKey);
    if (probe === "sent") {
      return {
        action: "skip",
        channelKey: message.channelKey,
        channelKind: message.channelKind,
        reason: "стартовое сообщение уже опубликовано этим ботом",
      };
    }
    if (probe === "unknown") {
      return {
        action: "blocked",
        channelKey: message.channelKey,
        channelKind: message.channelKind,
        reason:
          "не удалось проверить историю канала — сообщение не отправляется автоматически",
      };
    }
    if (channelPlan === undefined) {
      return {
        action: "blocked",
        channelKey: message.channelKey,
        channelKind: message.channelKind,
        reason: "канал отсутствует в целевой конфигурации",
      };
    }
    if (channelPlan.action === "conflict") {
      return {
        action: "blocked",
        channelKey: message.channelKey,
        channelKind: message.channelKind,
        reason: `конфликт канала: ${channelPlan.conflict?.message ?? "неизвестно"}`,
      };
    }
    return {
      action: "send",
      channelKey: message.channelKey,
      channelKind: message.channelKind,
      reason: null,
    };
  });

  warnings.push(...accessAudit);
  return {
    roles,
    categories,
    channels,
    messages: plannedMessages,
    conflicts,
    warnings,
    accessAudit,
  };
}

function channelEveryoneKind(
  channel: ChannelDefinition,
): EveryoneOverwriteKind {
  if (channel.staffOnly) {
    return "staff";
  }
  if (channel.readOnly) {
    return "readOnly";
  }
  if (channel.kind === "forum") {
    return "forum";
  }
  return "talk";
}

function planChannel(
  channel: ChannelDefinition,
  categoryResolution: CategoryResolution,
  snapshot: GuildSnapshot,
  conflicts: PlanConflict[],
  accessAudit: string[],
): PlannedChannel {
  const base = {
    channelKey: channel.key,
    name: channel.name,
    kind: channel.kind,
    categoryKey: categoryResolution.definition.key,
  };
  const existing =
    snapshot.channels.find(
      (candidate) =>
        candidate.type !== "category" &&
        normalizeName(candidate.name) === normalizeName(channel.name),
    ) ?? null;

  if (existing === null) {
    if (categoryResolution.nameClash !== null) {
      const conflict: PlanConflict = {
        kind: "channel-parent-category-conflict",
        message:
          `Канал "${channel.name}" не будет создан: категория ` +
          `"${categoryResolution.definition.name}" конфликтует с существующим каналом.`,
      };
      conflicts.push(conflict);
      return { ...base, action: "conflict", existingId: null, conflict };
    }
    // Prediction for a channel the bootstrap will create: exactly the
    // channel overwrites the executor sends to Discord (the category's own
    // overwrites never join a channel's runtime permissions).
    const plannedEffective = plannedEveryoneEffect(
      snapshot.everyonePermissions,
      channelEveryoneKind(channel),
    );
    if (channel.readOnly) {
      accessAudit.push(
        ...readOnlyAccessWarnings(channel.name, plannedEffective),
      );
    }
    if (channel.kind === "forum") {
      accessAudit.push(...forumAccessWarnings(channel.name, plannedEffective));
    }
    return { ...base, action: "create", existingId: null, conflict: null };
  }

  if (!acceptedSnapshotTypes(channel).includes(existing.type)) {
    const conflict: PlanConflict = {
      kind: "channel-type-mismatch",
      message:
        `Канал "${channel.name}" уже существует, но имеет тип "${existing.type}" вместо ` +
        `"${channel.kind}". Инструмент не изменяет тип — разрешите конфликт вручную.`,
    };
    conflicts.push(conflict);
    return { ...base, action: "conflict", existingId: existing.id, conflict };
  }

  const category = categoryResolution.existing;
  if (category === null || existing.parentId !== category.id) {
    const where =
      category === null
        ? `категория "${categoryResolution.definition.name}" ещё не существует`
        : `канал находится вне категории "${categoryResolution.definition.name}"`;
    const conflict: PlanConflict = {
      kind: "channel-outside-target-category",
      message:
        `Канал "${channel.name}" уже существует, но ${where}. Инструмент не перемещает каналы — ` +
        "разрешите конфликт вручную.",
    };
    conflicts.push(conflict);
    return { ...base, action: "conflict", existingId: existing.id, conflict };
  }

  // Existing channel: audit the real access from the channel's OWN
  // overwrites on top of the guild bitfield. Syncing with the parent
  // category is just a copy — an unsynced channel may differ, so the
  // category never contributes here. Warnings disappear once the owner
  // closes the gaps manually; the report always matches actual state.
  const effective = applyEveryoneOverwrites(
    snapshot.everyonePermissions,
    existing.permissionOverwrites,
    snapshot.guildId,
  );
  if (channel.readOnly) {
    accessAudit.push(...readOnlyAccessWarnings(channel.name, effective));
  }
  if (channel.kind === "forum") {
    accessAudit.push(...forumAccessWarnings(channel.name, effective));
  }
  if (channel.staffOnly) {
    const risk = staffVisibilityWarning(
      `Канал #${channel.name} (STAFF)`,
      effective,
    );
    if (risk !== null) {
      accessAudit.push(risk);
    }
  }
  return { ...base, action: "exists", existingId: existing.id, conflict: null };
}
