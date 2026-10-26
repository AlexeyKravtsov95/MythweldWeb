import type { Dictionary } from "../types";

export const ru = {
  meta: {
    htmlLang: "ru",
    ogLocale: "ru_RU",
    siteName: "Mythweld",
    homeTitle:
      "Mythweld — независимые инструменты для World of Warcraft: Forever",
    homeDescription:
      "Mythweld — независимая коллекция игровых инструментов: TalentForge, Forever Journey и Book Creator. Новый сайт в разработке.",
  },
  a11y: {
    skipToContent: "Перейти к содержимому",
    primaryNav: "Основная навигация",
    languageSwitcher: "Язык",
    homeLink: "Главная Mythweld",
    opensInNewTab: "откроется в новой вкладке",
  },
  languageNames: {
    en: "English",
    ru: "Русский",
  },
  home: {
    eyebrow: "Сайт в разработке",
    heading: "Mythweld",
    lead: "Независимая коллекция игровых инструментов для World of Warcraft: Forever. Это временная страница-заглушка, пока создаётся новый сайт.",
    productsHeading: "Продукты",
    products: {
      talentforge: {
        name: "TalentForge",
        kind: "Мобильное приложение",
        summary: "Планировщик билдов талантов для World of Warcraft: Forever.",
      },
      foreverJourney: {
        name: "Forever Journey",
        kind: "Игровой аддон",
        summary: "Аддон-дневник персонажа прямо в игре.",
      },
      bookCreator: {
        name: "Book Creator",
        kind: "Веб-инструмент",
        summary: "Генератор PDF-книг для печати прямо в браузере.",
      },
    },
    bookCreatorLinkLabel: "Открыть Book Creator",
    statusNote:
      "Страницы продуктов, скриншоты и ссылки на загрузку появятся здесь, когда будут готовы.",
  },
  footer: {
    disclaimer:
      "Mythweld — независимый фанатский проект, не связанный с Blizzard Entertainment.",
  },
} as const satisfies Dictionary;
