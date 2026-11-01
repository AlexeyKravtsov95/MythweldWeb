/**
 * Startup message content (EN + RU) and deduplication markers.
 *
 * Every payload carries a stable footer marker (`mythweld-bootstrap/<key>`),
 * so a re-run can detect messages published earlier by this bot and never
 * duplicate or overwrite anyone else's messages.
 */
import type { ChannelKind } from "./config.js";

export const FOOTER_MARKER_PREFIX = "mythweld-bootstrap";

export function footerMarker(channelKey: string): string {
  return `${FOOTER_MARKER_PREFIX}/${channelKey}`;
}

export interface EmbedInput {
  readonly title: string;
  readonly description: string;
  readonly footerText: string;
}

export interface StartupMessageDefinition {
  readonly channelKey: string;
  readonly channelKind: ChannelKind;
  /** Post title; used for forum posts only. */
  readonly title: string;
  readonly embeds: readonly EmbedInput[];
}

const ALLOWED_LINKS = [
  "https://mythweld.com/",
  "https://journal.mythweld.com/",
  "https://www.curseforge.com/wow/addons/forever-journey",
] as const;

const WELCOME_EN = [
  "**Welcome to Mythweld** — an independent project building tools for World of Warcraft players.",
  "",
  "**Products supported here**",
  "- **Forever Journey** — a World of Warcraft addon (see CurseForge for releases).",
  "- **TalentForge** — a Mythweld project for character talent planning.",
  "",
  "**Where to get help**",
  "- Forever Journey and Book Creator: post in the `FOREVER JOURNEY` forums below.",
  "- TalentForge: post in the `TALENTFORGE` forum.",
  "- Anything else: use `#general`.",
  "",
  "**Links**",
  `- Website: ${ALLOWED_LINKS[0]}`,
  `- Dev journal: ${ALLOWED_LINKS[1]}`,
  `- Forever Journey on CurseForge: ${ALLOWED_LINKS[2]}`,
].join("\n");

const WELCOME_RU = [
  "**Добро пожаловать в Mythweld** — независимый проект, создающий инструменты для игроков World of Warcraft.",
  "",
  "**Продукты, поддержка которых ведётся здесь**",
  "- **Forever Journey** — аддон для World of Warcraft (релизы — на CurseForge).",
  "- **TalentForge** — проект Mythweld для планирования талантов персонажа.",
  "",
  "**Где получить помощь**",
  "- Forever Journey и Book Creator: пишите в форумах `FOREVER JOURNEY` ниже.",
  "- TalentForge: пишите в форуме `TALENTFORGE`.",
  "- Всё остальное: в `#general`.",
  "",
  "**Ссылки**",
  `- Сайт: ${ALLOWED_LINKS[0]}`,
  `- Журнал разработки: ${ALLOWED_LINKS[1]}`,
  `- Forever Journey на CurseForge: ${ALLOWED_LINKS[2]}`,
].join("\n");

const RULES_EN = [
  "**Server rules**",
  "",
  "1. **Be respectful.** No harassment, hate speech or personal attacks.",
  "2. **No spam, ads or scam links**, including fake addon downloads and phishing.",
  "3. **Keep personal data safe.** Do not post your own or anyone else's real names, addresses or payment details.",
  "4. **Posting logs.** Share logs and SavedVariables only in the support forums, and remove personal information first.",
  "5. **Never post tokens, passwords or API keys** — including inside screenshots. If a secret leaked, rotate it immediately and tell the staff.",
  "",
  "The staff may remove messages that break these rules.",
].join("\n");

const RULES_RU = [
  "**Правила сервера**",
  "",
  "1. **Уважайте собеседников.** Никаких оскорблений, травли и личных нападок.",
  "2. **Никакого спама, рекламы и мошеннических ссылок**, включая фальшивые загрузки аддонов и фишинг.",
  "3. **Берегите личные данные.** Не публикуйте свои и чужие реальные имена, адреса или платёжные данные.",
  "4. **Публикация логов.** Делитесь логами и SavedVariables только в форумах поддержки и предварительно удалите персональные данные.",
  "5. **Никогда не публикуйте токены, пароли и API-ключи** — в том числе на скриншотах. Если секрет утёк, немедленно смените его и сообщите персоналу.",
  "",
  "Персонал может удалять сообщения, нарушающие правила.",
].join("\n");

const ANNOUNCEMENT_EN = [
  "**The Mythweld community server is open.**",
  "",
  "This channel will carry official announcements: product releases, updates and important news.",
  "For support and questions please use the product forums; for general chat — `#general`.",
].join("\n");

const ANNOUNCEMENT_RU = [
  "**Сервер сообщества Mythweld открыт.**",
  "",
  "В этом канале будут публиковаться официальные объявления: релизы продуктов, обновления и важные новости.",
  "За помощью и с вопросами обращайтесь в форумы продуктов; для общего общения — `#general`.",
].join("\n");

function forumGuideEn(product: string): string {
  return [
    `**How to report a bug or ask about ${product}**`,
    "",
    "Before posting, please check the existing topics — your issue may already be discussed.",
    "",
    "A good report includes:",
    "- **Version** — the exact version of the app/addon;",
    "- **Environment** — your OS or game client version;",
    "- **Steps to reproduce** — what you did, step by step;",
    "- **Expected result** and **actual result**.",
    "",
    "**Before attaching SavedVariables or logs**, remove personal data (character names, friend lists, private messages) from the files.",
    "",
    "Please use the tags `Bug`, `Question` and `Feature Request`. The staff marks solved topics with `Resolved`.",
  ].join("\n");
}

function forumGuideRu(product: string): string {
  return [
    `**Как сообщить об ошибке или задать вопрос о ${product}**`,
    "",
    "Перед публикацией проверьте существующие темы — возможно, ваш вопрос уже обсуждается.",
    "",
    "Хороший отчёт содержит:",
    "- **Версию** — точную версию приложения или аддона;",
    "- **Окружение** — версию ОС или игрового клиента;",
    "- **Шаги воспроизведения** — что вы делали, по порядку;",
    "- **Ожидаемый результат** и **фактический результат**.",
    "",
    "**Перед публикацией SavedVariables или логов** удалите из файлов персональные данные (имена персонажей, списки друзей, личные сообщения).",
    "",
    "Используйте теги `Bug`, `Question` и `Feature Request`. Персонал помечает решённые темы тегом `Resolved`.",
  ].join("\n");
}

function textChannelMessage(
  channelKey: string,
  titleEn: string,
  descriptionEn: string,
  titleRu: string,
  descriptionRu: string,
): StartupMessageDefinition {
  return {
    channelKey,
    channelKind: "text",
    title: "",
    embeds: [
      {
        title: titleEn,
        description: descriptionEn,
        footerText: footerMarker(channelKey),
      },
      {
        title: titleRu,
        description: descriptionRu,
        footerText: footerMarker(channelKey),
      },
    ],
  };
}

function forumGuidePost(
  channelKey: string,
  product: string,
): StartupMessageDefinition {
  return {
    channelKey,
    channelKind: "forum",
    title: `How to report an issue · Как сообщить о проблеме (${product})`,
    embeds: [
      {
        title: `How to get support for ${product}`,
        description: forumGuideEn(product),
        footerText: footerMarker(channelKey),
      },
      {
        title: `Поддержка ${product}`,
        description: forumGuideRu(product),
        footerText: footerMarker(channelKey),
      },
    ],
  };
}

export const STARTUP_MESSAGES: readonly StartupMessageDefinition[] = [
  textChannelMessage(
    "welcome",
    "Welcome to Mythweld",
    WELCOME_EN,
    "Добро пожаловать в Mythweld",
    WELCOME_RU,
  ),
  textChannelMessage(
    "rules",
    "Server rules",
    RULES_EN,
    "Правила сервера",
    RULES_RU,
  ),
  textChannelMessage(
    "announcements",
    "Mythweld Discord is live",
    ANNOUNCEMENT_EN,
    "Discord-сервер Mythweld запущен",
    ANNOUNCEMENT_RU,
  ),
  forumGuidePost("fj-support", "Forever Journey"),
  forumGuidePost("book-creator", "Book Creator"),
  forumGuidePost("talentforge-support", "TalentForge"),
];

export function findStartupMessage(
  channelKey: string,
): StartupMessageDefinition | undefined {
  return STARTUP_MESSAGES.find((message) => message.channelKey === channelKey);
}

/** All http(s) links used across the startup messages (for link audits). */
export const MESSAGE_LINKS: readonly string[] = [...ALLOWED_LINKS];
