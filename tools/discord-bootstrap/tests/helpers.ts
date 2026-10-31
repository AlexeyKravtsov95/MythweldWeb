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

let idCounter = 300000000000000000n;

function nextId(): string {
  idCounter += 1n;
  return idCounter.toString();
}

export interface FakeApiOptions {
  readonly permissionsBitfield?: bigint;
  readonly rolesManageable?: boolean;
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
  failCategoryKeys = new Set<string>();
  failRoleKeys = new Set<RoleCreateInput["roleKey"]>();

  constructor(options: FakeApiOptions = {}) {
    this.permissionsBitfield =
      options.permissionsBitfield ?? allRequiredBotBits();
    this.rolesManageable = options.rolesManageable ?? true;
  }

  async fetchSnapshot(): Promise<GuildSnapshot> {
    return {
      guildId: GUILD_ID,
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

/** Snapshot state in which the whole target layout already exists. */
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
    });
    for (const channel of category.channels) {
      channels.push({
        id: `chan-${channel.key}`,
        name: channel.name,
        type: channel.kind,
        parentId: categoryId,
      });
    }
  }
  return { channels, roles };
}
