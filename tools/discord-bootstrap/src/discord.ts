/**
 * discord.js adapter implementing the `DiscordApi` gateway used by the
 * executor. This is the only module that talks to Discord.
 *
 * Privileged intents: none. Only `Guilds` is requested, which is enough to
 * read channels/roles and to send the bot's own messages (reading other
 * users' message content is never needed and Message Content Intent stays off).
 */
import {
  ChannelType,
  Client,
  EmbedBuilder,
  ForumLayoutType,
  GatewayIntentBits,
  OverwriteType,
  type ChannelType as RawChannelType,
  type ForumChannel,
  type Guild,
  type GuildBasedChannel,
  type TextChannel,
} from "discord.js";
import { findChannel } from "./config.js";
import { footerMarker, STARTUP_MESSAGES } from "./messages.js";
import type {
  CategoryCreateInput,
  ChannelCreateInput,
  DiscordApi,
  RoleCreateInput,
} from "./executor.js";
import type {
  GuildSnapshot,
  MessageProbe,
  SnapshotChannel,
  SnapshotChannelType,
} from "./planner.js";
import type { OverwriteSpec } from "./permissions.js";
import type { StartupMessageDefinition } from "./messages.js";

const CREATE_REASON = "Mythweld Discord bootstrap (DISCORD-M0)";

/** Pure mapping from discord.js channel types to snapshot types. */
export function mapChannelType(type: RawChannelType): SnapshotChannelType {
  switch (type) {
    case ChannelType.GuildCategory:
      return "category";
    case ChannelType.GuildText:
      return "text";
    case ChannelType.GuildAnnouncement:
      return "announcement";
    case ChannelType.GuildForum:
      return "forum";
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return "voice";
    default:
      return "other";
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export interface DiscordConnection {
  readonly api: DiscordApi;
  login(): Promise<void>;
  destroy(): Promise<void>;
}

export function createDiscordConnection(
  botToken: string,
  guildId: string,
): DiscordConnection {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  let guild: Guild | null = null;

  const requireGuild = (): Guild => {
    if (guild === null) {
      throw new Error("Discord connection is not logged in yet");
    }
    return guild;
  };

  const toSnapshotChannel = (channel: GuildBasedChannel): SnapshotChannel => ({
    id: channel.id,
    name: channel.name,
    type: mapChannelType(channel.type),
    parentId: channel.parentId,
  });

  const toOverwrites = (overwrites: readonly OverwriteSpec[]) =>
    overwrites.map((spec) => ({
      id: spec.id,
      type:
        spec.id === client.user?.id ? OverwriteType.Member : OverwriteType.Role,
      allow: spec.allow.reduce((acc, bit) => acc | bit, 0n),
      deny: spec.deny.reduce((acc, bit) => acc | bit, 0n),
    }));

  const markerIn = (
    embeds: readonly { readonly footer?: { readonly text?: string } | null }[],
    channelKey: string,
  ): boolean =>
    embeds.some((embed) => embed.footer?.text === footerMarker(channelKey));

  const probeTextChannel = async (
    channel: TextChannel,
    channelKey: string,
  ): Promise<MessageProbe> => {
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      for (const message of messages.values()) {
        if (
          message.author.id === client.user?.id &&
          markerIn(message.embeds, channelKey)
        ) {
          return "sent";
        }
      }
      return "absent";
    } catch {
      return "unknown";
    }
  };

  const probeForumChannel = async (
    channel: ForumChannel,
    channelKey: string,
  ): Promise<MessageProbe> => {
    try {
      const active = await channel.threads.fetchActive();
      const archived = await channel.threads.fetchArchived({ limit: 100 });
      const threads = [
        ...active.threads.values(),
        ...archived.threads.values(),
      ];
      for (const thread of threads) {
        const starter = await thread.fetchStarterMessage().catch(() => null);
        if (
          starter !== null &&
          starter.author.id === client.user?.id &&
          markerIn(starter.embeds, channelKey)
        ) {
          return "sent";
        }
      }
      return "absent";
    } catch {
      return "unknown";
    }
  };

  const probeChannel = async (
    channelKey: string,
    definition: { readonly name: string; readonly kind: "text" | "forum" },
  ): Promise<MessageProbe> => {
    const g = requireGuild();
    const channel = g.channels.cache.find(
      (candidate) =>
        candidate.type !== ChannelType.GuildCategory &&
        normalizeName(candidate.name) === normalizeName(definition.name),
    );
    if (channel === undefined) {
      return "absent";
    }
    if (channel.type === ChannelType.GuildForum) {
      return probeForumChannel(channel, channelKey);
    }
    if (channel.isTextBased() && !channel.isThread()) {
      return probeTextChannel(channel as TextChannel, channelKey);
    }
    return "unknown";
  };

  const api: DiscordApi = {
    botUserId: "", // replaced with the real id in login()

    async fetchSnapshot(): Promise<GuildSnapshot> {
      const g = requireGuild();
      await g.channels.fetch();
      await g.roles.fetch();
      const channels = [...g.channels.cache.values()].map(toSnapshotChannel);
      const roles = [...g.roles.cache.values()].map((role) => ({
        id: role.id,
        name: role.name,
      }));
      const messageProbes: Record<string, MessageProbe> = {};
      for (const message of STARTUP_MESSAGES) {
        const definition = findChannel(message.channelKey);
        if (definition === undefined) {
          continue;
        }
        messageProbes[message.channelKey] = await probeChannel(
          message.channelKey,
          definition,
        );
      }
      return {
        guildId: g.id,
        channels,
        roles,
        messageProbes,
      };
    },

    async botGuildPermissions(): Promise<bigint> {
      const g = requireGuild();
      const me = g.members.me ?? (await g.members.fetchMe());
      return me.permissions.bitfield;
    },

    async isRoleManageable(roleId: string): Promise<boolean> {
      const g = requireGuild();
      const me = g.members.me ?? (await g.members.fetchMe());
      const role = await g.roles.fetch(roleId);
      if (role === null) {
        return false;
      }
      return me.roles.highest.comparePositionTo(role) > 0;
    },

    async createRole(input: RoleCreateInput): Promise<{ readonly id: string }> {
      const g = requireGuild();
      const role = await g.roles.create({
        name: input.name,
        permissions: input.permissionsBitfield,
        mentionable: false,
        reason: CREATE_REASON,
      });
      return { id: role.id };
    },

    async createCategory(
      input: CategoryCreateInput,
    ): Promise<{ readonly id: string }> {
      const g = requireGuild();
      const category = await g.channels.create({
        name: input.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: toOverwrites(input.overwrites),
        reason: CREATE_REASON,
      });
      return { id: category.id };
    },

    async createChannel(
      input: ChannelCreateInput,
    ): Promise<{ readonly id: string }> {
      const g = requireGuild();
      const permissionOverwrites = toOverwrites(input.overwrites);
      if (input.kind === "forum") {
        const forum = await g.channels.create({
          name: input.name,
          type: ChannelType.GuildForum,
          parent: input.parentId,
          topic: input.topic,
          permissionOverwrites,
          defaultForumLayout: ForumLayoutType.ListView,
          availableTags: input.forumTags.map((tag) => ({
            name: tag,
            moderated: tag === "Resolved",
          })),
          reason: CREATE_REASON,
        });
        return { id: forum.id };
      }
      const channel = await g.channels.create({
        name: input.name,
        type: ChannelType.GuildText,
        parent: input.parentId,
        topic: input.topic,
        permissionOverwrites,
        reason: CREATE_REASON,
      });
      return { id: channel.id };
    },

    async sendStartupMessage(
      channelId: string,
      message: StartupMessageDefinition,
    ): Promise<void> {
      const g = requireGuild();
      const channel = await g.channels.fetch(channelId);
      if (channel === null) {
        throw new Error(`Канал ${channelId} не найден`);
      }
      const embeds = message.embeds.map((embed) =>
        new EmbedBuilder()
          .setTitle(embed.title)
          .setDescription(embed.description)
          .setFooter({ text: embed.footerText }),
      );
      if (channel.type === ChannelType.GuildForum) {
        const forum = channel as ForumChannel;
        await forum.threads.create({
          name: message.title.slice(0, 100),
          message: { embeds },
          reason: CREATE_REASON,
        });
        return;
      }
      if (channel.isTextBased() && !channel.isThread()) {
        const text = channel as TextChannel;
        await text.send({ embeds });
        return;
      }
      throw new Error(`Канал ${channelId} не поддерживает отправку сообщений`);
    },
  };

  return {
    api,
    async login(): Promise<void> {
      await client.login(botToken);
      if (client.user === null) {
        throw new Error("Discord client has no user after login");
      }
      const apiRecord = api as { botUserId: string };
      apiRecord.botUserId = client.user.id;
      guild = await client.guilds.fetch(guildId);
    },
    async destroy(): Promise<void> {
      await client.destroy();
    },
  };
}
