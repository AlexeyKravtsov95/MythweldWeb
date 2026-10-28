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
    shareImageAlt:
      "Знак и название Mythweld, инструменты для World of Warcraft: Forever: TalentForge, Forever Journey, Book Creator",
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
    exploreForeverJourney: "Подробнее о Forever Journey",
    curseforgeStates: {
      available: "Доступен на CurseForge",
      testing: "Тестируется на CurseForge",
      prep: "Готовится к выходу на CurseForge",
    },
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
    legalPending:
      "Политика конфиденциальности, условия использования и контакты готовятся.",
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
  product: {
    flowLabel: "Планируйте → Играйте → Помните",
  },
  talentforgePage: {
    meta: {
      title: "TalentForge — планировщик талантов для WoW: Forever · Mythweld",
      description:
        "TalentForge — мобильное приложение для планирования талантов World of Warcraft: Forever для всех девяти классов в настоящих деревьях специализаций. Билды хранятся на телефоне, планировать можно без сети.",
    },
    kind: "Мобильное приложение · Android и iOS",
    lead: "Планируйте таланты для всех девяти классов World of Warcraft: Forever в настоящих деревьях специализаций. Билды остаются на телефоне.",
    dataVersionNote:
      "Данные талантов — это версия данных талантов World of Warcraft: Forever, на которых строятся билды, а не версия приложения.",
    classes: {
      heading: "Девять классов",
      text: "Выберите класс и начните билд. У каждого класса своя иллюстрация, нарисованная для TalentForge.",
      artwork: {
        title: "Иллюстрации классов",
        text: "Нарисованы для TalentForge. Используются при выборе класса и в сохранённых билдах. Это не игровые иконки.",
      },
      icons: {
        title: "Иконки талантов",
        text: "Из игры. Они видны только внутри деревьев, как на этом фрагменте редактора.",
      },
      iconsCropAlt:
        "Фрагмент редактора талантов TalentForge: ряды игровых иконок талантов со счётчиками рангов",
      iconsCropCaption:
        "Фрагмент редактора талантов · скриншот приложения, iPhone",
    },
    trees: {
      heading: "Настоящие деревья",
      text: "У каждого класса три дерева специализаций, построенные по данным клиента World of Warcraft: Forever.",
      points: {
        tabs: {
          title: "Три дерева рядом",
          text: "Переключайтесь между деревьями специализаций вкладками над деревом. На каждой вкладке видно, сколько очков в нём потрачено.",
        },
        rules: {
          title: "Правила игры",
          text: "Требования ярусов и обязательные таланты проверяются при каждом вложенном очке. Отмена и повтор всегда под рукой.",
        },
        details: {
          title: "Описания талантов",
          text: "Нажмите на талант, чтобы прочитать описание для текущего и следующего ранга.",
        },
        landscape: {
          title: "Если повернуть телефон",
          text: "В горизонтальном режиме описание таланта открывается в боковой панели рядом с деревом.",
        },
      },
    },
    features: {
      heading: "Что умеет",
      items: {
        autosave: {
          title: "Сохраняется сам",
          text: "Каждое изменение сохраняется сразу. Кнопки «Сохранить» нет: закройте приложение — билд останется.",
        },
        offline: {
          title: "Работает без сети",
          text: "Деревья, иконки и билды хранятся на телефоне. Для планирования сеть не нужна.",
        },
        languages: {
          title: "Английский и русский",
          text: "Приложение использует язык телефона. На русском названия и большинство описаний талантов берутся из русских текстов самой игры, остальное показывается на английском.",
        },
        share: {
          title: "Импорт и обмен билдами",
          text: "Отправьте билд коротким текстовым кодом через любой мессенджер или импортируйте полученный код.",
        },
        dataVersions: {
          title: "Билды помнят свои данные",
          text: "Сохранённый билд всегда открывается на той версии данных талантов, на которой он создан.",
        },
      },
      notShown: "На скриншотах этой страницы не показано.",
    },
    next: {
      text: "Дальше — игра. Forever Journey запишет путь.",
      action: "Forever Journey",
    },
  },
  foreverJourneyPage: {
    meta: {
      title: "Forever Journey — аддон-дневник для WoW: Forever · Mythweld",
      description:
        "Forever Journey — аддон для World of Warcraft: Forever, который ведёт дневник персонажа: уровни, зоны, смерти, победы над боссами и ваши заметки. Book Creator превращает его в PDF для печати прямо в браузере.",
    },
    kind: "Аддон для World of Warcraft",
    lead: "Ведёт дневник вашего персонажа, пока вы играете: уровни, зоны, смерти, победы над боссами и ваши заметки. Когда глава закончена, Book Creator превращает её в книгу для печати.",
    facts: {
      label: "Коротко",
      bookCreator: "Book Creator",
      worksInBrowser: "Работает в браузере",
      account: "Аккаунт",
      notNeeded: "Не нужен",
    },
    records: {
      heading: "Что записывает аддон",
      text: "Записи появляются по ходу игры. Заметки добавляете вы, когда захотите.",
      items: {
        levelUps: "Новые уровни",
        zones: "Зоны",
        deaths: "Смерти",
        bossKills: "Победы над боссами",
        notes: "Ваши заметки",
      },
    },
    steps: {
      heading: "Установите → Играйте → Соберите книгу",
      items: {
        install: {
          title: "Установите",
          text: "Скачайте аддон на CurseForge.",
        },
        play: {
          title: "Играйте",
          text: "Дневник заполняется сам.",
        },
        book: {
          title: "Соберите книгу",
          text: "Выгрузите дневник из аддона, откройте Book Creator и скачайте PDF.",
        },
      },
    },
    book: {
      label: "Book Creator",
      heading: "Из дневника — в книгу.",
      text: "Book Creator раскладывает дневник по главам и страницам и сохраняет PDF для печати.",
      points: {
        browser: "Работает в браузере, на вашем компьютере",
        account: "Без аккаунта",
        upload: "Ничего не загружается на сервер",
      },
      sampleCaption:
        "Страницы PDF, собранного в Book Creator · демо-персонаж, пример на английском",
    },
    journal: {
      heading: "Как передать дневник в Book Creator",
      text: "Аддон сам никуда не отправляет дневник. Выберите один из двух способов.",
      exportCode: {
        title: "Код экспорта",
        steps: [
          "В игре откройте журнал Forever Journey: введите /fj open или нажмите на значок у миникарты.",
          "Нажмите «Export Book»: аддон покажет блоки кода, которые начинаются с FJBOOK1:.",
          "Скопируйте все блоки и вставьте их в Book Creator.",
        ],
      },
      savedVariables: {
        title: "Файл SavedVariables",
        steps: [
          "В игре введите /reload, чтобы аддон записал данные на диск.",
          "Выберите в Book Creator файл WTF/Account/<ACCOUNT>/SavedVariables/ForeverJourney.lua из папки World of Warcraft.",
          "Выберите персонажа: журналы разных персонажей не объединяются.",
        ],
      },
      privacy:
        "В обоих случаях дневник читается и PDF собирается в вашем браузере. На сервер ничего не загружается.",
      archive:
        "Книга из файла SavedVariables дополняется архивом персонажа. Его значения — исторический снимок и могут не совпадать с текущим состоянием персонажа.",
    },
    next: {
      text: "Соберите билд до входа в игру.",
      action: "TalentForge",
    },
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
      warlock: "Черно\u00adкнижник",
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
    addon: {
      overview: {
        alt: "Forever Journey в World of Warcraft: Forever, вкладка Overview: паладин-нежить 20-го уровня, статистика путешествия и последние записанные открытия и гибель",
        caption:
          "Вкладка Overview · скриншот аддона в игре, английский интерфейс",
      },
      chronicle: {
        alt: "Хроника Forever Journey в World of Warcraft: Forever: лента открытых зон и нового уровня, с личной заметкой и отметкой «избранное»",
        caption:
          "Вкладка Chronicle · скриншот аддона в игре, английский интерфейс",
      },
    },
    addonNote:
      "Из галереи аддона на CurseForge. Текущая версия может выглядеть иначе.",
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
