/**
 * Execution engine. Works against a narrow `DiscordApi` interface so the
 * real discord.js adapter and unit-test fakes are interchangeable.
 *
 * Safety rules baked in:
 * - create only missing entities, never delete/rename/move existing ones;
 * - conflicts from the planner are reported, never auto-resolved;
 * - startup messages are only sent when the channel probe is "absent";
 * - a failed step never aborts independent steps; dependent steps are
 *   skipped so a re-run resumes from where the failure happened.
 */
import {
  TARGET_CONFIG,
  redactSecrets,
  findChannel,
  type ChannelKind,
  type RoleKey,
  type TargetConfig,
} from "./config.js";
import {
  categoryOverwrites,
  channelOverwrites,
  missingBotPermissions,
  rolePermissionsBitfield,
  type OverwriteSpec,
  type PermissionTargets,
} from "./permissions.js";
import { STARTUP_MESSAGES, type StartupMessageDefinition } from "./messages.js";
import {
  buildPlan,
  type BootstrapPlan,
  type GuildSnapshot,
} from "./planner.js";

export interface RoleCreateInput {
  readonly roleKey: RoleKey;
  readonly name: string;
  readonly permissionsBitfield: bigint;
}

export interface CategoryCreateInput {
  readonly categoryKey: string;
  readonly name: string;
  readonly staffOnly: boolean;
  readonly overwrites: readonly OverwriteSpec[];
}

export interface ChannelCreateInput {
  readonly channelKey: string;
  readonly name: string;
  readonly kind: ChannelKind;
  readonly categoryKey: string;
  readonly parentId: string;
  readonly topic: string;
  readonly overwrites: readonly OverwriteSpec[];
  readonly forumTags: readonly string[];
}

/**
 * Narrow gateway to Discord used by the executor. The real implementation
 * lives in `discord.ts`; unit tests provide fakes. Only the methods below
 * may mutate the guild, which makes "no mutations in dry-run" auditable.
 */
export interface DiscordApi {
  readonly botUserId: string;
  fetchSnapshot(): Promise<GuildSnapshot>;
  botGuildPermissions(): Promise<bigint>;
  /** `true` when the bot's highest role is above the given role. */
  isRoleManageable(roleId: string): Promise<boolean>;
  createRole(input: RoleCreateInput): Promise<{ readonly id: string }>;
  createCategory(input: CategoryCreateInput): Promise<{ readonly id: string }>;
  createChannel(input: ChannelCreateInput): Promise<{ readonly id: string }>;
  sendStartupMessage(
    channelId: string,
    message: StartupMessageDefinition,
  ): Promise<void>;
}

export interface StepResult {
  readonly label: string;
  readonly status: "ok" | "skipped" | "failed" | "warning";
  readonly detail: string;
}

export type ApplyStatus =
  "applied" | "applied-with-errors" | "aborted" | "permission-denied";

export interface ApplyOutcome {
  readonly status: ApplyStatus;
  readonly plan: BootstrapPlan;
  readonly steps: readonly StepResult[];
}

export interface ApplyOptions {
  /** Interactive gate: the plan is applied only when this resolves `true`. */
  readonly confirm: (plan: BootstrapPlan) => Promise<boolean>;
  /** Secrets (the bot token) to scrub from every reported error message. */
  readonly secrets: readonly string[];
  readonly log?: (line: string) => void;
}

export const TARGET: TargetConfig = TARGET_CONFIG;
export const MESSAGES: readonly StartupMessageDefinition[] = STARTUP_MESSAGES;

/** Reads the guild state and builds the plan without any mutation. */
export async function runDryRun(api: DiscordApi): Promise<BootstrapPlan> {
  const snapshot = await api.fetchSnapshot();
  return buildPlan(TARGET, MESSAGES, snapshot);
}

export async function runApply(
  api: DiscordApi,
  options: ApplyOptions,
): Promise<ApplyOutcome> {
  const snapshot = await api.fetchSnapshot();
  const plan = buildPlan(TARGET, MESSAGES, snapshot);
  const steps: StepResult[] = [];
  const redact = (text: string): string => redactSecrets(text, options.secrets);
  const errorMessage = (error: unknown): string =>
    redact(error instanceof Error ? error.message : String(error));

  // 1. Verify the bot's actual guild-level permissions.
  const bitfield = await api.botGuildPermissions();
  const missing = missingBotPermissions(bitfield);
  if (missing.length > 0) {
    steps.push({
      label: "Проверка прав бота",
      status: "failed",
      detail:
        `Боту не хватает прав: ${missing.join(", ")}. Выдайте их роли бота в настройках сервера ` +
        "и повторите запуск.",
    });
    return { status: "permission-denied", plan, steps };
  }

  // 2. Explicit owner confirmation of the summary.
  const confirmed = await options.confirm(plan);
  if (!confirmed) {
    return { status: "aborted", plan, steps };
  }

  // 3. Roles.
  const roleIdByKey: Partial<Record<RoleKey, string>> = {};
  for (const planned of plan.roles) {
    if (planned.action === "exists" && planned.existingId !== null) {
      roleIdByKey[planned.roleKey] = planned.existingId;
    }
  }
  const manageableRoleIds = new Set<string>();

  for (const planned of plan.roles) {
    if (planned.action === "exists") {
      steps.push({
        label: `Роль ${planned.name}`,
        status: "skipped",
        detail: "уже существует — не изменяется",
      });
      continue;
    }
    try {
      const created = await api.createRole({
        roleKey: planned.roleKey,
        name: planned.name,
        permissionsBitfield: rolePermissionsBitfield(planned.roleKey),
      });
      roleIdByKey[planned.roleKey] = created.id;
      const manageable = await api.isRoleManageable(created.id);
      if (manageable) {
        manageableRoleIds.add(created.id);
      }
      steps.push({
        label: `Роль ${planned.name}`,
        status: manageable ? "ok" : "warning",
        detail: manageable
          ? "создана"
          : "создана, но роль бота в иерархии ниже — перетащите роль бота выше и повторите запуск",
      });
    } catch (error) {
      steps.push({
        label: `Роль ${planned.name}`,
        status: "failed",
        detail: errorMessage(error),
      });
    }
  }
  for (const roleId of Object.values(roleIdByKey)) {
    if (roleId !== undefined && !manageableRoleIds.has(roleId)) {
      if (await api.isRoleManageable(roleId)) {
        manageableRoleIds.add(roleId);
      }
    }
  }

  const targets: PermissionTargets = {
    everyoneRoleId: snapshot.guildId,
    roleIdByKey,
    botUserId: api.botUserId,
  };

  /** Drops overwrites that reference roles the bot cannot manage yet. */
  const usableOverwrites = (
    specs: readonly OverwriteSpec[],
  ): readonly OverwriteSpec[] => {
    const knownRoleIds = new Set(
      Object.values(roleIdByKey).filter((id): id is string => id !== undefined),
    );
    return specs.filter(
      (spec) => !knownRoleIds.has(spec.id) || manageableRoleIds.has(spec.id),
    );
  };

  // 4. Categories.
  const categoryIdByKey = new Map<string, string>();
  for (const planned of plan.categories) {
    if (planned.action === "exists" && planned.existingId !== null) {
      categoryIdByKey.set(planned.categoryKey, planned.existingId);
      steps.push({
        label: `Категория ${planned.name}`,
        status: "skipped",
        detail: "уже существует — не изменяется",
      });
      continue;
    }
    if (planned.action === "conflict") {
      steps.push({
        label: `Категория ${planned.name}`,
        status: "failed",
        detail: planned.conflict?.message ?? "конфликт",
      });
      continue;
    }
    const definition = TARGET.categories.find(
      (category) => category.key === planned.categoryKey,
    );
    if (definition === undefined) {
      steps.push({
        label: `Категория ${planned.name}`,
        status: "failed",
        detail: "определение не найдено в целевой конфигурации",
      });
      continue;
    }
    try {
      const created = await api.createCategory({
        categoryKey: planned.categoryKey,
        name: planned.name,
        staffOnly: definition.staffOnly,
        overwrites: usableOverwrites(categoryOverwrites(definition, targets)),
      });
      categoryIdByKey.set(planned.categoryKey, created.id);
      steps.push({
        label: `Категория ${planned.name}`,
        status: "ok",
        detail: "создана",
      });
    } catch (error) {
      steps.push({
        label: `Категория ${planned.name}`,
        status: "failed",
        detail: errorMessage(error),
      });
    }
  }

  // 5. Channels.
  const channelIdByKey = new Map<string, string>();
  for (const planned of plan.channels) {
    if (planned.action === "exists" && planned.existingId !== null) {
      channelIdByKey.set(planned.channelKey, planned.existingId);
      steps.push({
        label: `Канал #${planned.name}`,
        status: "skipped",
        detail: "уже существует — не изменяется",
      });
      continue;
    }
    if (planned.action === "conflict") {
      steps.push({
        label: `Канал #${planned.name}`,
        status: "failed",
        detail: planned.conflict?.message ?? "конфликт",
      });
      continue;
    }
    const parentId = categoryIdByKey.get(planned.categoryKey);
    if (parentId === undefined) {
      steps.push({
        label: `Канал #${planned.name}`,
        status: "skipped",
        detail:
          "категория не создана — канал будет создан при следующем запуске",
      });
      continue;
    }
    const definition = findChannel(planned.channelKey);
    if (definition === undefined) {
      steps.push({
        label: `Канал #${planned.name}`,
        status: "failed",
        detail: "определение не найдено в целевой конфигурации",
      });
      continue;
    }
    const topic = `${definition.topicEn} · ${definition.topicRu}`.slice(
      0,
      1024,
    );
    try {
      const created = await api.createChannel({
        channelKey: planned.channelKey,
        name: planned.name,
        kind: planned.kind,
        categoryKey: planned.categoryKey,
        parentId,
        topic,
        overwrites: usableOverwrites(channelOverwrites(definition, targets)),
        forumTags: planned.kind === "forum" ? [...definition.forumTags] : [],
      });
      channelIdByKey.set(planned.channelKey, created.id);
      steps.push({
        label: `Канал #${planned.name}`,
        status: "ok",
        detail:
          planned.kind === "forum" ? "создан (форум)" : "создан (текстовый)",
      });
    } catch (error) {
      steps.push({
        label: `Канал #${planned.name}`,
        status: "failed",
        detail: errorMessage(error),
      });
    }
  }

  // 6. Startup messages (only where the probe said "absent").
  for (const planned of plan.messages) {
    const message = MESSAGES.find(
      (candidate) => candidate.channelKey === planned.channelKey,
    );
    if (message === undefined) {
      steps.push({
        label: `Сообщение для ${planned.channelKey}`,
        status: "failed",
        detail: "определение не найдено",
      });
      continue;
    }
    if (planned.action === "skip") {
      steps.push({
        label: `Сообщение в #${planned.channelKey}`,
        status: "skipped",
        detail: planned.reason ?? "уже опубликовано",
      });
      continue;
    }
    if (planned.action === "blocked") {
      steps.push({
        label: `Сообщение в #${planned.channelKey}`,
        status: "warning",
        detail: planned.reason ?? "отправка заблокирована",
      });
      continue;
    }
    const channelId = channelIdByKey.get(planned.channelKey);
    if (channelId === undefined) {
      steps.push({
        label: `Сообщение в #${planned.channelKey}`,
        status: "skipped",
        detail:
          "канал не существует или не создан — сообщение будет отправлено при следующем запуске",
      });
      continue;
    }
    try {
      await api.sendStartupMessage(channelId, message);
      steps.push({
        label: `Сообщение в #${planned.channelKey}`,
        status: "ok",
        detail: "опубликовано (EN + RU)",
      });
    } catch (error) {
      steps.push({
        label: `Сообщение в #${planned.channelKey}`,
        status: "failed",
        detail: errorMessage(error),
      });
    }
  }

  const failed = steps.filter((step) => step.status === "failed");
  return {
    status: failed.length > 0 ? "applied-with-errors" : "applied",
    plan,
    steps,
  };
}
