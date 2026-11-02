/**
 * Shared in-memory fakes for the unit tests. Nothing here touches the
 * network: `FakeDiscordApi` only records mutations in memory, so tests can
 * assert exactly what a dry-run or apply would do.
 */
import { PermissionFlagsBits } from "discord.js";
import type {
  CategoryCreateInput,
  ChannelCreateInput,
  DiscordApi,
  RoleCreateInput,
} from "../src/executor.js";
import type {
  GuildSnapshot,
  MessageProbe,
  SnapshotChannel,
  SnapshotRole,
} from "../src/planner.js";
import { TARGET_CONFIG } from "../src/config.js";
import {
  categoryOverwrites,
  channelOverwrites,
  type OverwriteSpec,
  type PermissionTargets,
  type SnapshotOverwrite,
} from "../src/permissions.js";
import type { StartupMessageDefinition } from "../src/messages.js";

export const GUILD_ID = "100000000000000001";
export const BOT_USER_ID = "200000000000000002";

export function allRequiredBotBits(): bigint {
  return (
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.EmbedLinks |
    PermissionFlagsBits.ReadMessageHistory |
    PermissionFlagsBits.ManageChannels |
    PermissionFlagsBits.ManageRoles
  );
}

/**
 * Permissions a fresh Discord server's @everyone role typically has,
 * including thread permissions. The tool never assumes these defaults —
 * it reads the real bitfield (auditEveryonePermissions); this constant is
 * only the fake's initial guild state for tests.
 */
export function typicalEveryoneBits(): bigint {
  return (
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.EmbedLinks |
    PermissionFlagsBits.AttachFiles |
    PermissionFlagsBits.ReadMessageHistory |
    PermissionFlagsBits.AddReactions |
    PermissionFlagsBits.UseExternalEmojis |
    PermissionFlagsBits.CreatePublicThreads |
    PermissionFlagsBits.CreatePrivateThreads |
    PermissionFlagsBits.SendMessagesInThreads |
    PermissionFlagsBits.ChangeNickname
  );
}

let idCounter = 300000000000000000n;

function nextId(): string {
  idCounter += 1n;
  return idCounter.toString();
}

/** Converts the executor's overwrite specs into snapshot overwrite records. */
export function toSnapshotOverwrites(
  specs: readonly OverwriteSpec[],
): SnapshotOverwrite[] {
  return specs.map((spec) => ({
    id: spec.id,
    allow: spec.allow.reduce((acc, bit) => acc | bit, 0n),
    deny: spec.deny.reduce((acc, bit) => acc | bit, 0n),
  }));
}

export interface FakeApiOptions {
  readonly permissionsBitfield?: bigint;
  readonly rolesManageable?: boolean;
  readonly everyonePermissions?: bigint;
}

export class FakeDiscordApi implements DiscordApi {
  readonly botUserId = BOT_USER_ID;
  channels: SnapshotChannel[] = [];
  roles: SnapshotRole[] = [];
  messageProbes: Record<string, MessageProbe> = {};

  readonly createdRoles: RoleCreateInput[] = [];
  readonly createdCategoryRecords: {
    input: CategoryCreateInput;
    id: string;
  }[] = [];
  readonly createdChannels: ChannelCreateInput[] = [];
  readonly sentMessages: {
    channelId: string;
    message: StartupMessageDefinition;
  }[] = [];

  /** Counts every mutating call — must stay 0 in dry-run tests. */
  mutations = 0;

  permissionsBitfield: bigint;
  rolesManageable: boolean;
  everyonePermissions: bigint;
  failCategoryKeys = new Set<string>();
  failRoleKeys = new Set<RoleCreateInput["roleKey"]>();

  constructor(options: FakeApiOptions = {}) {
    this.permissionsBitfield =
      options.permissionsBitfield ?? allRequiredBotBits();
    this.rolesManageable = options.rolesManageable ?? true;
    this.everyonePermissions =
      options.everyonePermissions ?? typicalEveryoneBits();
  }

  async fetchSnapshot(): Promise<GuildSnapshot> {
    return {
      guildId: GUILD_ID,
      everyonePermissions: this.everyonePermissions,
      channels: [...this.channels],
      roles: [...this.roles],
      messageProbes: { ...this.messageProbes },
    };
  }

  async botGuildPermissions(): Promise<bigint> {
    return this.permissionsBitfield;
  }

  async isRoleManageable(): Promise<boolean> {
    return this.rolesManageable;
  }

  async createRole(input: RoleCreateInput): Promise<{ readonly id: string }> {
    this.mutations += 1;
    if (this.failRoleKeys.has(input.roleKey)) {
      throw new Error(`mock: role create failed for ${input.name}`);
    }
    // Simulates real Discord behaviour: a bot cannot create a role whose
    // permissions exceed its own (Administrator on the bot lifts the limit).
    const botIsAdmin =
      (this.permissionsBitfield & PermissionFlagsBits.Administrator) ===
      PermissionFlagsBits.Administrator;
    const exceedsBot =
      !botIsAdmin &&
      (input.permissionsBitfield & ~this.permissionsBitfield) !== 0n;
    if (exceedsBot) {
      throw new Error(
        "DiscordAPIError[50013]: Missing Permissions — role requires permissions the bot does not have",
      );
    }
    this.createdRoles.push(input);
    const id = nextId();
    this.roles.push({ id, name: input.name });
    return { id };
  }

  async createCategory(
    input: CategoryCreateInput,
  ): Promise<{ readonly id: string }> {
    this.mutations += 1;
    if (this.failCategoryKeys.has(input.categoryKey)) {
      throw new Error(`mock: category create failed for ${input.name}`);
    }
    const id = nextId();
    this.createdCategoryRecords.push({ input, id });
    this.channels.push({
      id,
      name: input.name,
      type: "category",
      parentId: null,
      permissionOverwrites: toSnapshotOverwrites(input.overwrites),
    });
    return { id };
  }

  async createChannel(
    input: ChannelCreateInput,
  ): Promise<{ readonly id: string }> {
    this.mutations += 1;
    this.createdChannels.push(input);
    const id = nextId();
    this.channels.push({
      id,
      name: input.name,
      type: input.kind === "forum" ? "forum" : "text",
      parentId: input.parentId,
      permissionOverwrites: toSnapshotOverwrites(input.overwrites),
    });
    return { id };
  }

  async sendStartupMessage(
    channelId: string,
    message: StartupMessageDefinition,
  ): Promise<void> {
    this.mutations += 1;
    this.sentMessages.push({ channelId, message });
    // Simulate the real probe: after sending, the marker is detectable.
    this.messageProbes[message.channelKey] = "sent";
  }
}

/**
 * Snapshot state in which the whole target layout already exists with NO
 * overwrites (a neutral pre-existing server): read-only channels stay
 * writable and STAFF stays visible — the audit must flag both.
 */
export function fullExistingState(): {
  channels: SnapshotChannel[];
  roles: SnapshotRole[];
} {
  const channels: SnapshotChannel[] = [];
  const roles: SnapshotRole[] = TARGET_CONFIG.roles.map((role) => ({
    id: `role-${role.key}`,
    name: role.name,
  }));
  for (const category of TARGET_CONFIG.categories) {
    const categoryId = `cat-${category.key}`;
    channels.push({
      id: categoryId,
      name: category.name,
      type: "category",
      parentId: null,
      permissionOverwrites: [],
    });
    for (const channel of category.channels) {
      channels.push({
        id: `chan-${channel.key}`,
        name: channel.name,
        type: channel.kind,
        parentId: categoryId,
        permissionOverwrites: [],
      });
    }
  }
  return { channels, roles };
}

const SECURED_TARGETS: PermissionTargets = {
  everyoneRoleId: GUILD_ID,
  roleIdByKey: { moderator: "900000000000000111" },
  botUserId: BOT_USER_ID,
};

/** Extra thread denies the owner adds by hand in read-only channels. */
const MANUAL_THREAD_DENY = [
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
];

/**
 * Snapshot state where the layout exists AND the owner completed every
 * manual access step: read-only channels also deny thread permissions,
 * STAFF is hidden, forums carry the intended allow set. The effective
 * access audit must come back empty for this state.
 */
export function securedExistingState(): {
  channels: SnapshotChannel[];
  roles: SnapshotRole[];
} {
  const state = fullExistingState();
  const updated: SnapshotChannel[] = [];
  for (const category of TARGET_CONFIG.categories) {
    const categoryId = `cat-${category.key}`;
    updated.push({
      id: categoryId,
      name: category.name,
      type: "category",
      parentId: null,
      permissionOverwrites: toSnapshotOverwrites(
        categoryOverwrites(category, SECURED_TARGETS),
      ),
    });
    for (const channel of category.channels) {
      const baseSpecs = channelOverwrites(channel, SECURED_TARGETS);
      // For read-only channels the owner manually extended the bot's deny
      // with the thread rights.
      const specs = channel.readOnly
        ? baseSpecs.map((spec) =>
            spec.id === GUILD_ID
              ? { ...spec, deny: [...spec.deny, ...MANUAL_THREAD_DENY] }
              : spec,
          )
        : baseSpecs;
      updated.push({
        id: `chan-${channel.key}`,
        name: channel.name,
        type: channel.kind,
        parentId: categoryId,
        permissionOverwrites: toSnapshotOverwrites(specs),
      });
    }
  }
  return { channels: updated, roles: state.roles };
}
