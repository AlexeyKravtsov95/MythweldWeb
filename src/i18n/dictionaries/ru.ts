import type { Dictionary } from "../types";

export const ru = {
  meta: {
    htmlLang: "ru",
    ogLocale: "ru_RU",
    dateLocale: "ru-RU",
    siteName: "Mythweld",
    homeTitle:
      "Mythweld — независимые инструменты для World of Warcraft: Forever",
    homeDescription:
      "Независимые инструменты для World of Warcraft: Forever. TalentForge помогает планировать билды талантов на телефоне, а аддон Forever Journey ведёт дневник в игре, из которого Book Creator делает книгу для печати.",
  },
  a11y: {
    skipToContent: "Перейти к содержимому",
    primaryNav: "Основная навигация",
    languageSwitcher: "Язык",
    homeLink: "Главная Mythweld",
    menu: "Меню",
    footerNav: "Ссылки в подвале",
    opensInNewTab: "откроется в новой вкладке",
  },
  languageNames: {
    en: "English",
    ru: "Русский",
  },
  home: {
    eyebrow: "Инструменты для World of Warcraft: Forever",
    heading: "Соберите билд. Сохраните историю.",
    lead: "Планировщик талантов для телефона и дневник в игре, из которого получается книга для печати.",
    productsHeading: "Продукты",
    products: {
      talentforge: {
        name: "TalentForge",
        kind: "Мобильное приложение",
        summary:
          "Планируйте таланты для всех девяти классов в настоящих деревьях специализаций и возвращайтесь к билдам позже.",
      },
      foreverJourney: {
        name: "Forever Journey",
        kind: "Аддон для WoW",
        summary:
          "Записывает уровни, зоны, смерти, победы над боссами и ваши заметки, пока вы играете.",
      },
      bookCreator: {
        name: "Book Creator",
        kind: "Веб-инструмент",
        summary: "Превращает дневник в PDF-книгу для печати прямо в браузере.",
      },
    },
    talentforgeFeatures: {
      autosave: "Сохраняет при каждом изменении",
      offline: "Работает без сети",
      languages: "Английский и русский",
    },
    exploreTalentforge: "Подробнее о TalentForge",
    pagePending: "страница готовится",
    curseforgeStates: {
      available: "Доступен на CurseForge",
      testing: "Тестируется на CurseForge",
      prep: "Готовится к выходу на CurseForge",
    },
    addonPlaceholderNote: "Не рисуем и не имитируем.",
    downloadAddon: "Скачать аддон",
    bookCreatorLinkLabel: "Создать книгу приключений",
    bookSample: {
      coverAlt:
        "Обложка примера книги на английском: My Journey, Aelirien, ночной эльф, друид, уровень 80",
      chapterAlt:
        "Страница примера книги на английском: глава I, июнь 2026 г., записи дневника",
      caption: "Пример книги на английском · демо-персонаж",
    },
    flow: {
      heading: "Планируйте → Играйте → Помните",
      steps: {
        plan: { title: "Планируйте", text: "TalentForge — до входа в игру." },
        play: { title: "Играйте", text: "Forever Journey — пока качаетесь." },
        remember: {
          title: "Помните",
          text: "Book Creator — когда глава закончена.",
        },
      },
    },
  },
  footer: {
    disclaimer:
      "Mythweld — независимый фанатский проект. Он не связан с Blizzard Entertainment и не одобрен ею. World of Warcraft и связанные названия и изображения — товарные знаки Blizzard Entertainment, Inc.",
    products: "Продукты",
    getTools: "Где взять",
    site: "Сайт",
    pages: {
      privacy: "Конфиденциальность",
      terms: "Условия",
      contact: "Контакты",
    },
  },
  release: {
    heading: "Статус выпуска",
    updated: "Обновлено",
    states: {
      available: "Доступно",
      testing: "Закрытое тестирование",
      prep: "В подготовке",
    },
    channels: {
      android: "Android",
      ios: "iOS",
      googlePlay: "Google Play",
      appStore: "App Store",
      talentData: "Данные талантов",
    },
  },
  actions: {
    linkPending: "ссылка ожидается",
    inPreparation: "в подготовке",
  },
  talentforge: {
    classNames: {
      warrior: "Воин",
      paladin: "Паладин",
      hunter: "Охотник",
      rogue: "Разбой\u00adник",
      priest: "Жрец",
      shaman: "Шаман",
      mage: "Маг",
      warlock: "Чернок\u00adнижник",
      druid: "Друид",
    },
    classArtworkCaption: "Девять классов · иллюстрации TalentForge",
  },
  media: {
    images: {
      "tf-editor": {
        alt: "Редактор талантов TalentForge на iPhone: билд паладина, дерево «Свет», потрачено 33 из 51 очка, в дереве игровые иконки талантов",
        caption: "Редактор талантов · скриншот приложения, iPhone",
      },
      "tf-class-picker": {
        alt: "Выбор класса в TalentForge на iPhone: девять классов с иллюстрациями TalentForge, данные талантов 1.60.1",
        caption: "Выбор класса · скриншот приложения, iPhone",
      },
      "tf-build-library": {
        alt: "Главный экран TalentForge на iPhone: билд паладина, к которому можно вернуться, и недавние билды жреца, друида и мага",
        caption: "Сохранённые билды · скриншот приложения, iPhone",
      },
      "bc-sample-cover": {
        alt: "Обложка примера книги: «Моё путешествие», Straider, эльф крови, маг, уровень 80",
        caption: "Пример книги · тестовый журнал",
      },
      "bc-sample-chapter": {
        alt: "Страница примера книги: глава I, январь 2026 г., записи дневника",
        caption: "Страница примера книги · тестовый журнал",
      },
      "bc-app-cover": {
        alt: "Book Creator в браузере: обложка книги «Моё путешествие» демо-персонажа",
        caption: "Book Creator · скриншот веб-приложения",
      },
      "bc-app-chapter": {
        alt: "Book Creator в браузере: страница главы «Сентябрь 2026 г.» с записями дневника",
        caption: "Book Creator · скриншот веб-приложения",
      },
    },
    requiredBeforeRelease: "Обязательно до релиза",
    placeholders: {
      addonScreenshot: {
        title: "Скриншот аддона в игре",
        note: "Здесь будет настоящий скриншот аддона в World of Warcraft: Forever. Его не рисуют и не имитируют.",
      },
      editorLandscape: {
        title: "Редактор талантов в горизонтальной ориентации",
        note: "Здесь будет проверенный горизонтальный скриншот приложения. Не имитируется.",
      },
      bookCreatorScreenshot: {
        title: "Скриншот Book Creator на английском",
        note: "Пока есть только снимок с русским интерфейсом. Не имитируется.",
      },
    },
  },
} as const satisfies Dictionary;
