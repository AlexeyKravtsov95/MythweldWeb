# Assets manifest — WEB-M0.2 … WEB-M0.5

Реестр всех изображений и шрифтов сайта: откуда взят файл, что это, на каком языке и где его можно показывать. Машиночитаемая версия — `src/media/catalog.ts`; тест `tests/media.test.ts` сверяет каталог, файлы (SHA-256, размеры) и этот документ.

Эталон композиции и правил: **Mythweld v3.2 — Production Design** (PDF, стр. 1, 25–27, 58–59, 80–81; исходник — холст Claude Design «Mythweld v3.2 — Production Design», версия `1793031909-ccd9`). PDF лежит у владельца и в репозиторий не коммитится.

## Правила использования

1. Показываем только файлы из этого реестра. Пиксели не меняем: без перерисовки, ретуши, наложений, рамок-телефонов, теней и наклона. Допустимы только уменьшенные производные AVIF/WebP, которые `astro:assets` строит при сборке (`FigureWithCaption`, `ClassArtworkGrid`).
2. Кадрирование — только CSS и всегда с подписью о том, что это фрагмент.
3. Язык изображения следует языку страницы: `pickMedia(group, locale)`. Если файла для языка нет — `AssetPlaceholder`, а не изображение на другом языке. Исключения прямо подписаны языком изображения: EN-образец книги на RU-страницах (B4) и снимки аддона с английским интерфейсом на RU-страницах (B1).
4. У каждого изображения есть alt, описывающий содержимое, и подпись «что это · тип» (`media.images.*` в словарях). Плитки классов с видимым названием — `alt=""`.
5. Типы не подменяют друг друга:
   - **class artwork** — оригинальные иллюстрации классов TalentForge (118×118). Только они используются для плиток классов.
   - **game talent icons** — иконки талантов из игры. Отдельными файлами **не импортируются**; видны только внутри скриншотов редактора (`containsGameTalentIcons: true`).
   - **app screenshot** — снимки приложения TalentForge. Все текущие — **iOS (iPhone 17 Pro, симулятор)**; называть их Android-скриншотами нельзя.
   - **Book Creator sample** — страницы PDF, созданного Book Creator. Это не интерфейс аддона.
   - **Book Creator screenshot** — снимки веб-приложения Book Creator. Это не игровые скриншоты.
   - **addon screenshot** — скриншот аддона Forever Journey в игре (Overview, Chronicle). Не Book Creator и не книга.
6. Рядом с игровыми изображениями на страницах сайта должен быть fan-disclaimer (подвал, `footer.disclaimer`): «not affiliated with or endorsed by Blizzard Entertainment… World of Warcraft and related names and images are trademarks of Blizzard Entertainment, Inc.»

## Источники

| Репозиторий                          | Ветка | Commit                                     |
| ------------------------------------ | ----- | ------------------------------------------ |
| `AlexeyKravtsov95/TalentForge`       | main  | `69e2dde5560eb12fd24066c5ed5f7ad29d4756a3` |
| `AlexeyKravtsov95/ForeverJourneyWeb` | main  | `ceea82d456d7f04aeee4164b3ef088947e743349` |

Оба репозитория только читались; в них ничего не менялось.

Опубликованные владельцем файлы (WEB-M0.5): галерея аддона на CurseForge, https://www.curseforge.com/wow/addons/forever-journey/gallery — копии байт-в-байт, без hotlink.

## Изображения

### TalentForge · class artwork (язык-нейтральные)

Источник: `mobile/composeApp/src/commonMain/composeResources/drawable/class_<id>.png`, копия байт-в-байт. 118×118 PNG. Назначение: плитки классов (`ClassArtworkGrid`).

| Файл                                                     | Источник (TalentForge)                                                         | SHA-256                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `src/assets/media/talentforge/classes/class-warrior.png` | `mobile/composeApp/src/commonMain/composeResources/drawable/class_warrior.png` | `75a41eb26a2e3b9db070457efdf2c3d5daafb22c6bb09829236aa7a211a11ed9` |
| `src/assets/media/talentforge/classes/class-paladin.png` | `mobile/composeApp/src/commonMain/composeResources/drawable/class_paladin.png` | `1b3201445756fd0c4c062cddac6ceaac2379a6a3db6df6fecc9bf389af24a40d` |
| `src/assets/media/talentforge/classes/class-hunter.png`  | `mobile/composeApp/src/commonMain/composeResources/drawable/class_hunter.png`  | `3e7d194506214f475044a04064aea6ff81b2fcab46f805689ae4c5306a917b29` |
| `src/assets/media/talentforge/classes/class-rogue.png`   | `mobile/composeApp/src/commonMain/composeResources/drawable/class_rogue.png`   | `2bf7aa077b0f690b50cd3b7dda82f9d469c69c71c434f2aa1cf1dea89e1b0359` |
| `src/assets/media/talentforge/classes/class-priest.png`  | `mobile/composeApp/src/commonMain/composeResources/drawable/class_priest.png`  | `9a4413ada75bf849479a2e2b862bcd6e744547d3bc7123785154ec9751152f7d` |
| `src/assets/media/talentforge/classes/class-shaman.png`  | `mobile/composeApp/src/commonMain/composeResources/drawable/class_shaman.png`  | `abcaff9a2c42ff3a5f3dfa0496fb9b81b9e92bdd540be7e636751b0d58a8e13a` |
| `src/assets/media/talentforge/classes/class-mage.png`    | `mobile/composeApp/src/commonMain/composeResources/drawable/class_mage.png`    | `fc06552b45c82f6798ba3031d9e4986520af41cb3f740b4d0ac42b2c3f5a1776` |
| `src/assets/media/talentforge/classes/class-warlock.png` | `mobile/composeApp/src/commonMain/composeResources/drawable/class_warlock.png` | `af25921f16e4cb5a20296b08be509a2501c4649ce390fb67123bbdcd5f911817` |
| `src/assets/media/talentforge/classes/class-druid.png`   | `mobile/composeApp/src/commonMain/composeResources/drawable/class_druid.png`   | `b0f32bee96acc570bcab5d4ce297f22276e1db1bd73b2cce9cdfb47478706815` |

### TalentForge · app screenshots (iOS, EN / RU)

Источник: `docs/release/apple-appstore/submission/screenshots/{en-US,ru}/iphone-6.3/`, копия байт-в-байт (SHA совпадают с `manifest.json` в TalentForge). 1206×2622 PNG. Снято 2026-10-24: Release-сборка TalentForge 1.0.0 (1), iPhone 17 Pro, iOS 26.4.1 Simulator, `simctl io screenshot`, строка состояния 9:41, без кадрирования и правок. Личных данных нет: только демонстрационные билды («Paladin build», «Priest build» и т. п.).

| Группа             | Язык | Файл                                                                      | Источник (TalentForge)                                                                     | SHA-256                                                            | Содержимое                                                                  |
| ------------------ | ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `tf-editor`        | en   | `src/assets/media/talentforge/screenshots/en/iphone-01-editor.png`        | `docs/release/apple-appstore/submission/screenshots/en-US/iphone-6.3/01-editor.png`        | `4568543aef66e3151cacf906c863f1d04a6412fcf47b7bbbce1fade787669b80` | редактор: Paladin, дерево Holy, 33/51; **внутри — игровые иконки талантов** |
| `tf-editor`        | ru   | `src/assets/media/talentforge/screenshots/ru/iphone-01-editor.png`        | `docs/release/apple-appstore/submission/screenshots/ru/iphone-6.3/01-editor.png`           | `de99192c7624611a60b4a598b14075a41837f62efc5bc44d909d02c3165d1905` | то же на русском (дерево «Свет»); **внутри — игровые иконки талантов**      |
| `tf-class-picker`  | en   | `src/assets/media/talentforge/screenshots/en/iphone-03-class-picker.png`  | `docs/release/apple-appstore/submission/screenshots/en-US/iphone-6.3/03-class-picker.png`  | `2e83ca7d27f3a8c5bae436e8a838ce73de1ca4c3cd59fe6d569de5d9b0985133` | выбор класса: 9 class artwork, «talent data 1.60.1»                         |
| `tf-class-picker`  | ru   | `src/assets/media/talentforge/screenshots/ru/iphone-03-class-picker.png`  | `docs/release/apple-appstore/submission/screenshots/ru/iphone-6.3/03-class-picker.png`     | `e362938d4c5468b2944ff7e9e92600a9bf066008d3ed908dab7e3aa821604c66` | то же на русском («данные талантов 1.60.1»)                                 |
| `tf-build-library` | en   | `src/assets/media/talentforge/screenshots/en/iphone-04-build-library.png` | `docs/release/apple-appstore/submission/screenshots/en-US/iphone-6.3/04-build-library.png` | `346300eb537b99a7263cedb00c470730b3872de4dd29ef966673c572d157ee27` | главный экран: продолжить Paladin build, недавние Priest/Druid/Mage         |
| `tf-build-library` | ru   | `src/assets/media/talentforge/screenshots/ru/iphone-04-build-library.png` | `docs/release/apple-appstore/submission/screenshots/ru/iphone-6.3/04-build-library.png`    | `3920d270ce90b7a02d50342c5e9892b1659b6782c58f10259998de53ce9b11a7` | то же на русском                                                            |

Подпись: «… · app screenshot, iPhone» / «… · скриншот приложения, iPhone».

### Book Creator · sample pages (EN / RU)

Растр страниц оригинальных PDF из `ForeverJourneyWeb/docs/pdf-samples/`. Метод: macOS PDFKit, `page.draw(.mediaBox)` на белом фоне, масштаб 1.5 (892×1262 PNG), без иных изменений — тот же способ, что для макета v3.2. Страница PDF показывается без радиуса.

| Группа              | Язык | Файл                                                   | Источник (ForeverJourneyWeb), стр.                    | SHA-256 файла                                                      |
| ------------------- | ---- | ------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------ |
| `bc-sample-cover`   | en   | `src/assets/media/book-creator/samples/en/cover.png`   | `docs/pdf-samples/client-demo-book.pdf`, стр. 1       | `e6ae96fb4d8036d4511d025f3151a50d993d4c5eb0c8a8b23942aa3e34ddf490` |
| `bc-sample-chapter` | en   | `src/assets/media/book-creator/samples/en/chapter.png` | `docs/pdf-samples/client-demo-book.pdf`, стр. 3       | `d0d20c86c95a5cb6a2ebebe7c042ef91ee75944e5030d203b0cb9df2ef32a015` |
| `bc-sample-cover`   | ru   | `src/assets/media/book-creator/samples/ru/cover.png`   | `docs/pdf-samples/client-localization-ru.pdf`, стр. 1 | `59690be669f2d0cf6b5d78e28e10c75b01d9102b1a5bbd1fb67bd43aacf217ba` |
| `bc-sample-chapter` | ru   | `src/assets/media/book-creator/samples/ru/chapter.png` | `docs/pdf-samples/client-localization-ru.pdf`, стр. 3 | `ad28bbb974c0628f9b6dff9870888257815b988405bb20c32862ac7a5f6d7d83` |

SHA-256 исходных PDF: `client-demo-book.pdf` — `d6243615b0bc23806d49f0d87381cf7cace446003d5bdc84615dd689f3b6e464`; `client-localization-ru.pdf` — `977d91934f5ed84c460b2461b2a8db8409ec3fc3b5f4743d5f93e302a88ccba8`.

- EN — встроенный демо-журнал Book Creator (выдуманный персонаж Aelirien, Night Elf Druid), как на стр. 58–59 эталона. Подпись «Sample book · demo character».
- RU — пример локализации (`buildStraiderJournal()` в `scripts/generate-pdf-samples.tsx`): записи синтетические, но имя персонажа «Straider» взято из санитизированного архива `ClassicBetaPvP:Straider`. Подпись «Пример книги · тестовый журнал» (не «демо-персонаж»). См. блокер B4.

### Book Creator · web app screenshots (только RU)

Копия байт-в-байт `ForeverJourneyWeb/docs/screenshots/`. 2560×1249 PNG. Интерфейс Book Creator на русском (переключатель RU активен), демо-журнал «Траллина» из `scripts/generate-test-codes.mjs` — личных данных нет.

| Группа           | Язык | Файл                                                           | Источник (ForeverJourneyWeb)        | SHA-256                                                            |
| ---------------- | ---- | -------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `bc-app-cover`   | ru   | `src/assets/media/book-creator/screenshots/ru/app-cover.png`   | `docs/screenshots/book-cover.png`   | `1afa62dfe304731731ccf14a0c8dd14ace0846dc7814decb9827afe27bf1bbc7` |
| `bc-app-chapter` | ru   | `src/assets/media/book-creator/screenshots/ru/app-chapter.png` | `docs/screenshots/book-chapter.png` | `86cb9c9b871e21dce8c0073c25ad4934cfe729115952aa4cdc396f280a99e5b3` |

На EN-страницах вместо них — placeholder «Book Creator screenshot in English» (`MEDIA_GAPS`, блокер B3).

### Forever Journey · in-game addon screenshots (только EN-интерфейс)

Копии байт-в-байт оригиналов из галереи аддона на CurseForge; скачаны и сверены с галереей **2026-10-27**. Разрешение на повторное использование на mythweld.com дал владелец в комментарии к Issue #9 (решение по B1 от 2026-10-27). Тип в каталоге — `addon-screenshot`, платформа `game`, `ADDON_SCREENSHOTS` в `src/media/catalog.ts`.

| ID          | Файл                                                      | Оригинал (CurseForge)                                             | Размер   | SHA-256                                                            | Содержимое                                                                                                                    |
| ----------- | --------------------------------------------------------- | ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `overview`  | `src/assets/media/forever-journey/addon/en/overview.png`  | https://media.forgecdn.net/attachments/1990/233/overview-png.png  | 1073×730 | `4f81a8f6a4d5a00dca72e0fc25a16f87cb564f524d20794680044cc342844ae2` | вкладка Overview: персонаж Straider, Undead Paladin, 20 ур., статистика, Recent Journey; даты в кадре 25–26.09.2026           |
| `chronicle` | `src/assets/media/forever-journey/addon/en/chronicle.png` | https://media.forgecdn.net/attachments/2037/694/timeline2-png.png | 1074×729 | `3a085be70d2c6717f0cceaaa4232adb7b0ac0a58973124e5cee3b65fdcc97334` | вкладка Timeline («Journey Chronicle»): открытия зон, Level 26, личная заметка и избранное; имени персонажа и дат в кадре нет |

Проверка содержимого: интерфейс аддона на **английском**; чата, других персонажей, имени аккаунта и иных личных данных в кадре нет. Имя персонажа Straider на Overview владелец разрешил. В alt имя не повторяется.

Ограничения (подписаны на сайте строкой «Из галереи аддона на CurseForge. Текущая версия может выглядеть иначе.»):

- **Актуальность не подтверждена.** Overview снят около 26.09.2026, до первого публичного файла 0.1.0-beta.1 (29.09.2026); текущий релиз на CurseForge — 0.7.0, файл от 23.10.2026. Исходников аддона в доступных репозиториях нет, поэтому совпадение с текущим UI не проверить. Снимки не названы «текущим интерфейсом».
- **Разрешение ниже желаемого** (≈1074 px против ≥1600 px). Не апскейлились: `FigureWithCaption` отдаёт 400, 800 и исходные 1073/1074 px.
- **Только английский интерфейс**, хотя аддон заявляет EN и RU локализацию. На RU-страницах подпись «английский интерфейс».
- Остальные 6 снимков галереи (History, Timeline, statistics, backup, Memory, Personal Note) не импортированы: владелец назвал кандидатами Overview и Chronicle.

### Не импортировано (намеренно)

- `data/visuals/forever` и любые отдельные иконки талантов — запрещено задачей.
- `ForeverJourneyWeb/docs/screenshots/archive-*.png` — смешанный язык и данные реального персонажа из архива.
- `ForeverJourneyWeb/docs/screenshots/landing.png`, `book-mobile.png` — не нужны компонентам этого PR.
- Остальные App Store-скриншоты (`02-talent-details`, `05-share-code`, `06-import-preview`) — не нужны этому PR; при необходимости добавляются тем же способом.

## Шрифты

Размещены локально в `public/fonts/`, подключены в `src/styles/fonts.css`; внешних font CDN нет. Лицензия SIL OFL 1.1 лежит рядом с файлами (`OFL.txt`).

| Файл                                                         | Источник                                                                                 | Оси / начертание                   | SHA-256                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `public/fonts/geologica/geologica-latin-wght-shrp.woff2`     | npm `@fontsource-variable/geologica@5.3.0`, `files/geologica-latin-shrp-normal.woff2`    | wght 100–900, SHRP 0–100; Latin    | `3688f2351fe14885bdf739641607bdc455d92918c9fffadf05f09d69e9f3d87e` |
| `public/fonts/geologica/geologica-cyrillic-wght-shrp.woff2`  | npm `@fontsource-variable/geologica@5.3.0`, `files/geologica-cyrillic-shrp-normal.woff2` | wght 100–900, SHRP 0–100; Cyrillic | `1de1554b2dd1c345d4d572085023cda58b88a2c7968953cdd24f77237af99cdb` |
| `public/fonts/geologica/OFL.txt`                             | тот же пакет, `LICENSE` — © 2020 The Geologica Project Authors                           | —                                  | `1ed2ffe9ee7048846f4bc5b28bf655113fd7d53e7717bf251dd68130af73016c` |
| `public/fonts/jetbrains-mono/jetbrains-mono-latin-500.woff2` | npm `@fontsource/jetbrains-mono@5.3.0`, `files/jetbrains-mono-latin-500-normal.woff2`    | 500; Latin                         | `cb182feeed4d798ff6961d3c79f7026279448fca0676438aaecb21f3fc39553a` |
| `public/fonts/jetbrains-mono/OFL.txt`                        | тот же пакет, `LICENSE` — © 2020 The JetBrains Mono Project Authors                      | —                                  | `403581b69dac5cff4079205e01c6b467e56af449ecbd7247693ddb1baafa005b` |

Upstream: Google Fonts (`google/fonts`), Geologica v5, JetBrains Mono v24. Fallback — системный стек из `--font-sans` / `--font-mono`; символы вне подмножеств (например, стрелки ↗ →) берутся из системного шрифта.

## Логотип и favicon

`src/components/LogoMark.astro` и `public/favicon.svg` совпадают с SVG доски «Design System & Components» (раздел 03): viewBox 64, два path — `M8 8h30v14H22v34H8z` (bronze `#C29A62`) и `M56 56H26V42h16V8h14z` (steel `#9AA8AE`). Новое начертание не придумывалось. Вариант «плашка (favicon, иконка)» в favicon не применён: при 16 px знак внутри плашки стал бы ~11 px, ниже минимума 16 px из той же доски. Плашка понадобится для крупных иконок (apple-touch-icon, PWA) — это отдельная задача.

## Использование на главной (WEB-M0.3)

- TalentForge: `tf-editor` для языка страницы (на ≤600 кадрируется сверху только CSS, 786:1100) и девять иллюстраций классов.
- Forever Journey: вместо скриншота аддона — placeholder «In-game addon screenshot» (B1). Страницы `bc-sample-*` подписаны как пример книги Book Creator, не как скриншоты аддона.
- На **обеих** локалях показан EN-образец (`bc-sample-cover/chapter`, `en`, синтетический персонаж Aelirien); на RU — с подписью «Пример книги на английском · демо-персонаж». RU-образец со «Straider» на главную не выводится до решения по B4 (проверяется тестом `tests/home.test.ts`).

## Использование на продуктовых страницах (WEB-M0.4)

Новых файлов нет: страницы используют только записи этого реестра через `pickMedia(group, locale)`.

- **TalentForge** (`/talentforge/`, `/ru/talentforge/`): `tf-editor` языка страницы (первый экран, `loading="eager"`), `tf-class-picker`, `tf-build-library`, девять иллюстраций классов с названиями (`alt=""`) и одна иллюстрация воина в пояснении «Class artwork». Игровые иконки талантов показаны только как **CSS-фрагмент** `tf-editor` (`object-fit`/`object-position`, пиксели не меняются) с подписью «Fragment of the talent editor · app screenshot, iPhone» / «Фрагмент редактора талантов · …».
- Блок «The real trees» — **без изображения**: горизонтального снимка нет (B2), а рендер из макета (стр. 26) отклонён. Фраза макета «All three specialization trees on one screen when you turn the phone» не используется: по `TalentForge/docs/mobile-architecture.md` (M5.UX.2b.1) в горизонтальном режиме дерево остаётся одно, а описание таланта открывается боковой панелью 300 dp — это и написано на странице.
- Пункт макета «Data updates over the air» не используется: удалённая доставка данных реализована, но выключена во всех сборках (`TalentForge/docs/ota/README.md`, M5.OTA.PROD.1). Вместо него — «Builds keep their data» (сохранённый билд открывается на своей версии данных, M5.DATA).
- **Forever Journey** (`/forever-journey/`, `/ru/forever-journey/`): placeholder «In-game addon screenshot» (B1) на первом экране; в разделе Book Creator — EN-образец `bc-sample-cover/chapter` на обеих локалях, на RU с подписью «… пример на английском» (B4). Скриншоты интерфейса Book Creator (`bc-app-*`) не показаны: EN-снимка нет (B3), а RU-снимок не подменяет EN.
- Путь «журнал → книга» описан по `ForeverJourneyWeb/src/i18n.ts` и `README.md`: код `FJBOOK1` (`/fj` → Export Book) или файл `ForeverJourney.lua` из SavedVariables; книга собирается в браузере, на сервер ничего не загружается. Архив персонажа подписан как исторический снимок.

## Share-карточки (Open Graph, Twitter) — WEB-M0.5

`public/og/mythweld-en.png` и `public/og/mythweld-ru.png`, 1200×630 PNG. Собраны на этом сайте: знак `LogoMark` (те же два path), слово «Mythweld» и строка `home.eyebrow` шрифтом Geologica, названия трёх продуктов с цветами из токенов, фон `--color-bg`. **Игровых изображений, скриншотов и интерфейсов нет.** Способ: разметка карточки вставлена в страницу `astro preview` (шрифты сайта уже загружены), снимок Chrome DevTools 1200×630 при DPR 1, без последующей обработки. Подключены в `BaseLayout` через `SITE.shareImage` (`og:image`, `twitter:image`, alt — `meta.shareImageAlt`).

| Файл                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `public/og/mythweld-en.png` | `ad3f0020b9d0d1ca637f26cf4cb84ff3d60832da61fc6e3eb70f1372d1e5551c` |
| `public/og/mythweld-ru.png` | `0cface19d6b4f9b55a9e54ff854953659d05b9ecbbaa1f99bab66870af88f69d` |

## Использование на страницах (WEB-M0.5)

- **Главная** и **Forever Journey**: placeholder «In-game addon screenshot» убран. На главной — `overview`; на странице Forever Journey — `overview` на первом экране (`loading="eager"`) и `chronicle` рядом со списком «Что записывает аддон». Подпись «Вкладка … · скриншот аддона в игре» и строка о галерее CurseForge.
- RU-образец книги со «Straider» (`bc-sample-*`, `ru`) исключён из glob в `src/media/images.ts`: раньше его исходники попадали в `dist/_astro/` как файлы без ссылок. Тест `tests/release.test.ts` сверяет SHA-256 всех изображений `dist/` с этими файлами. Файлы остаются в репозитории и в истории Git; история не переписывалась.

## Блокеры

| ID  | Что нужно                                                                            | Сейчас                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Скриншот аддона Forever Journey в игре (PNG без обработки, ≥1600 px, EN и RU клиент) | **Закрыт для релиза** (WEB-M0.5): `ADDON_SCREENSHOTS.overview/chronicle` из галереи CurseForge с разрешения владельца. Остаётся улучшение: свежие снимки текущей версии ≥1600 px и снимок RU-интерфейса.                                                                                                                                                                                                                                                                            |
| B2  | Проверенный горизонтальный скриншот редактора TalentForge (EN и RU)                  | Placeholder `media.placeholders.editorLandscape`. Кандидаты отклонены: `ipad-13/01-editor.png` — портретный iPad, не горизонтальная сцена; `docs/screenshots/m5-ux2b1/m5ux2b1-915x412-3-tree2-selected.png` (использован в макете v3.2) — рендер Compose Desktop из теста с заглушками «Tree 1/2/3», не снимок устройства; `docs/release/rc3-evidence/screenshots/14-editor-landscape-ru.png` — Android-эмулятор Pixel 9a, только RU, помечен как test evidence с временным ключом. |
| B3  | Скриншот веб-приложения Book Creator с английским интерфейсом                        | Есть только RU (`book-cover.png`, `book-chapter.png`); на EN — placeholder `media.placeholders.bookCreatorScreenshot`.                                                                                                                                                                                                                                                                                                                                                              |
| B4  | Подтвердить RU-образец книги или дать RU-PDF демо-журнала                            | RU-страницы из `client-localization-ru.pdf` содержат имя «Straider» из санитизированного архива реального персонажа. Нужно подтверждение владельца или RU-версия `client-demo-book.pdf`. С WEB-M0.5 эти файлы исключены из сборки (`src/media/images.ts`) и не публикуются даже без ссылок.                                                                                                                                                                                         |
| B5  | Android-скриншоты TalentForge для подписей «Android»                                 | Все импортированные скриншоты — iOS и подписаны «iPhone».                                                                                                                                                                                                                                                                                                                                                                                                                           |
| B6  | Ссылки Google Play / App Store                                                       | `RELEASE.talentforge.googlePlay/appStore = null` → на странице TalentForge чип «link pending» и disabled-кнопки; в подвале — статус платформы («Закрытое тестирование» / «В подготовке»), а не ссылка.                                                                                                                                                                                                                                                                              |
| B7  | Адреса и тексты Privacy / Terms / Contact для сайта Mythweld                         | `src/config/legal.ts` — все `null`; подвал показывает одну строку «готовятся», без ссылок. Черновики EN/RU — `docs/legal-drafts/` (не публикуются). `legal.mythweld.com/privacy.html` и `terms.html` относятся к Android-приложению TalentForge и не подставлены. Нужно решение владельца.                                                                                                                                                                                          |
