/**
 * Target Discord server layout and runtime configuration loading.
 *
 * This module is intentionally free of `discord.js` imports so that the
 * planner and unit tests can work with plain data only.
 */

export type RoleKey = "moderator" | "developer" | "member";

export type ChannelKind = "text" | "forum";

export interface ChannelDefinition {
  /** Stable identifier used in plans, messages and tests. */
  readonly key: string;
  /** Discord channel name (text channel names are lowercased by Discord). */
  readonly name: string;
  readonly kind: ChannelKind;
  /** `true` — @everyone can read but not send (welcome, rules, announcements). */
  readonly readOnly: boolean;
  /** `true` — hidden from everyone except staff and the bootstrap bot. */
  readonly staffOnly: boolean;
  readonly topicEn: string;
  readonly topicRu: string;
  /** Tags for forum channels; ignored for text channels. */
  readonly forumTags: readonly string[];
}

export interface CategoryDefinition {
  readonly key: string;
  readonly name: string;
  readonly staffOnly: boolean;
  readonly channels: readonly ChannelDefinition[];
}

export interface RoleDefinition {
  readonly key: RoleKey;
  readonly name: string;
}

export interface TargetConfig {
  readonly categories: readonly CategoryDefinition[];
  readonly roles: readonly RoleDefinition[];
}

export const TARGET_CONFIG: TargetConfig = {
  roles: [
    { key: "moderator", name: "Moderator" },
    { key: "developer", name: "Developer" },
    { key: "member", name: "Member" },
  ],
  categories: [
    {
      key: "information",
      name: "INFORMATION",
      staffOnly: false,
      channels: [
        {
          key: "welcome",
          name: "welcome",
          kind: "text",
          readOnly: true,
          staffOnly: false,
          topicEn:
            "Start here: what Mythweld is, which products are supported and where to get help.",
          topicRu:
            "Начните здесь: что такое Mythweld, какие продукты поддерживаются и где получить помощь.",
          forumTags: [],
        },
        {
          key: "rules",
          name: "rules",
          kind: "text",
          readOnly: true,
          staffOnly: false,
          topicEn: "Community rules for the Mythweld server.",
          topicRu: "Правила сервера сообщества Mythweld.",
          forumTags: [],
        },
        {
          key: "announcements",
          name: "announcements",
          kind: "text",
          readOnly: true,
          staffOnly: false,
          topicEn: "Official Mythweld announcements.",
          topicRu: "Официальные объявления Mythweld.",
          forumTags: [],
        },
      ],
    },
    {
      key: "forever-journey",
      name: "FOREVER JOURNEY",
      staffOnly: false,
      channels: [
        {
          key: "fj-support",
          name: "fj-support",
          kind: "forum",
          readOnly: false,
          staffOnly: false,
          topicEn:
            "Forever Journey support: bug reports, questions and feature requests.",
          topicRu:
            "Поддержка Forever Journey: сообщения об ошибках, вопросы и пожелания.",
          forumTags: ["Bug", "Question", "Feature Request", "Resolved"],
        },
        {
          key: "book-creator",
          name: "book-creator",
          kind: "forum",
          readOnly: false,
          staffOnly: false,
          topicEn: "Book Creator support: questions, feedback and bug reports.",
          topicRu:
            "Поддержка Book Creator: вопросы, обратная связь и сообщения об ошибках.",
          forumTags: ["Bug", "Question", "Feature Request", "Resolved"],
        },
      ],
    },
    {
      key: "talentforge",
      name: "TALENTFORGE",
      staffOnly: false,
      channels: [
        {
          key: "talentforge-support",
          name: "talentforge-support",
          kind: "forum",
          readOnly: false,
          staffOnly: false,
          topicEn:
            "TalentForge support: bug reports, questions and feature requests.",
          topicRu:
            "Поддержка TalentForge: сообщения об ошибках, вопросы и пожелания.",
          forumTags: ["Bug", "Question", "Feature Request", "Resolved"],
        },
      ],
    },
    {
      key: "community",
      name: "COMMUNITY",
      staffOnly: false,
      channels: [
        {
          key: "general",
          name: "general",
          kind: "text",
          readOnly: false,
          staffOnly: false,
          topicEn: "General discussion for the Mythweld community.",
          topicRu: "Общее обсуждение сообщества Mythweld.",
          forumTags: [],
        },
      ],
    },
    {
      key: "staff",
      name: "STAFF",
      staffOnly: true,
      channels: [
        {
          key: "mod-log",
          name: "mod-log",
          kind: "text",
          readOnly: false,
          staffOnly: true,
          topicEn: "Moderation log. Staff only.",
          topicRu: "Журнал модерации. Только для персонала.",
          forumTags: [],
        },
      ],
    },
  ],
};

export function findChannel(key: string): ChannelDefinition | undefined {
  for (const category of TARGET_CONFIG.categories) {
    for (const channel of category.channels) {
      if (channel.key === key) {
        return channel;
      }
    }
  }
  return undefined;
}

export interface BootstrapEnv {
  readonly botToken: string;
  readonly guildId: string;
}

/** Error raised for invalid or missing configuration; never contains the token. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const SNOWFLAKE_PATTERN = /^\d{17,20}$/;

export type EnvSource = Readonly<Record<string, string | undefined>>;

export function loadEnv(source: EnvSource = process.env): BootstrapEnv {
  const token = source["DISCORD_BOT_TOKEN"]?.trim() ?? "";
  const guildId = source["DISCORD_GUILD_ID"]?.trim() ?? "";

  if (token.length === 0) {
    throw new ConfigError(
      "DISCORD_BOT_TOKEN is not set. Copy .env.example to .env and fill in the bot token.",
    );
  }
  if (!SNOWFLAKE_PATTERN.test(guildId)) {
    throw new ConfigError(
      "DISCORD_GUILD_ID is not set or is not a Discord snowflake (17-20 digits). " +
        "Copy the server ID with Discord Developer Mode enabled.",
    );
  }
  return { botToken: token, guildId };
}

/** Replaces every occurrence of the given secrets with a placeholder. */
export function redactSecrets(
  text: string,
  secrets: readonly string[],
): string {
  let result = text;
  for (const secret of secrets) {
    if (secret.length > 0) {
      result = result.split(secret).join("[REDACTED]");
    }
  }
  return result;
}
