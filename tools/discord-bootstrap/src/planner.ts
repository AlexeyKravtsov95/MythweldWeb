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

export type SnapshotChannelType =
  "category" | "text" | "forum" | "voice" | "announcement" | "other";

export interface SnapshotChannel {
  readonly id: string;
  readonly name: string;
  readonly type: SnapshotChannelType;
  readonly parentId: string | null;
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
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function expectedSnapshotType(kind: ChannelKind): SnapshotChannelType {
  return kind;
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
        planChannel(channel, resolution, snapshot, conflicts, warnings),
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

  return {
    roles,
    categories,
    channels,
    messages: plannedMessages,
    conflicts,
    warnings,
  };
}

function planChannel(
  channel: ChannelDefinition,
  categoryResolution: CategoryResolution,
  snapshot: GuildSnapshot,
  conflicts: PlanConflict[],
  warnings: string[],
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
    return { ...base, action: "create", existingId: null, conflict: null };
  }

  if (existing.type !== expectedSnapshotType(channel.kind)) {
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

  if (channel.readOnly) {
    warnings.push(
      `Канал "${channel.name}" уже существует — проверьте вручную, что @everyone не может отправлять сообщения.`,
    );
  }
  if (channel.staffOnly) {
    warnings.push(
      `Канал "${channel.name}" уже существует — проверьте вручную, что он скрыт от обычных участников.`,
    );
  }
  return { ...base, action: "exists", existingId: existing.id, conflict: null };
}
