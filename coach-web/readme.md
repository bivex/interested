Коротко — это библиотека с «ядром» логики Coach: она собирает правила (advice) для анализа страницы (DOM/скрипт, который нужно запустить в браузере) и для анализа HAR-файла, выполняет анализ и объединяет результаты.

Основные вещи и как это работает
- Назначение: искать проблемы производительности, best-practices и privacy на веб‑странице. README и документация: https://www.sitespeed.io/documentation/coach/
- Входы:
  - DOM‑анализ — JavaScript (dist/coach.min.js), который вы запускаете в браузере и получаете результат (domAdviceResult).
  - HAR — HTTP Archive (HAR) от браузера/инструмента.
- Основной API (lib/index.js — экспорт):
  - async getDomAdvice() — возвращает содержимое dist/coach.min.js (строку с JS), который нужно выполнить в браузере.
  - async getHarAdvice() — динамически загружает набор модулей advice из папки lib/har (категории вроде bestpractice, performance и т. п.).
  - async analyseHar(har, harAdvice?, domAdviceResult?, options?) — анализирует HAR. Если harAdvice не передан, берет его из getHarAdvice(). Внутри использует pagexray.convert для получения страниц/активов и harRunner.runAdvice для запуска правил.
  - merge(domAdviceResult, harAdviceResult) — объединяет результаты DOM-анализа и HAR-анализа (использует ./merge).
  - pickAPage(har, pageIndex) — выбрать конкретную страницу из HAR с несколькими записями (полезно при нескольких прогонов).
  - getThirdPartyWeb(), getPageXray(), версии зависимостей — утилитарные экспорты.
- Где хранятся правила:
  - DOM‑скрипт генерируется/комбинируется в dist/coach.js → dist/coach.min.js (используется в браузере).
  - HAR‑правила лежат в lib/har/<категория>/*.js и при вызове getHarAdvice() загружаются require.
- Как собирать / запускать локально:
  - Требование Node: >= 18 (package.json).
  - npm install
  - npm run combine (создает dist/coach.js через tools/combine.js)
  - npm run terser (минифицирует → dist/coach.min.js) — или просто npm run prepare / npm run gen-dist (prepare запускает combine + terser).
  - Тесты: npm test (теги: test:api, test:dom, test:har, test:merge)
- Зависимости ключевые: pagexray (анализ ассетов/HAR), third-party-web (каталог третьих‑сторонних), wappalyzer-core (детектирование технологий) и lodash-utils.

Пример типового сценария (есть в README)
1. const coach = require('coach-core')
2. const domAdviceJavaScript = await coach.getDomAdvice() — выполнить этот код в браузере (например, через Puppeteer) и получить domResult.
3. Получить HAR от браузера, можно выбрать страницу: coach.pickAPage(har, 0).
4. const harResult = await coach.analyseHar(firstPageHar)
5. const coachResult = coach.merge(domResult, harResult)

Если хотите, могу:
- Показать структуру папки lib/har и конкретные примеры правил (advice).
- Показать, как запускать getDomAdvice и исполнять его в Puppeteer / Playwright (пример кода).
- Пошагово собрать dist/coach.min.js и выполнить локальный анализ на вашем HAR/странице.

Что вам интереснее — обзор кода правил, пример использования в Puppeteer или собрать/запустить локально?

Вот что есть в репозитории **sitespeedio/coach-core** ( https://github.com/sitespeedio/coach-core ) — показываю структуру HAR‑части и как именно запускаются правила.

## 1) Структура `lib/har/`
Папка `lib/har` содержит «HAR‑движок» и набор правил (advice), разбитых по категориям:

**Папки (категории):**
- `lib/har/bestpractice/`
- `lib/har/performance/`
- `lib/har/privacy/`
- `lib/har/info/`

**Файлы:**
- `lib/har/index.js` — раннер: вызывает `processPage()` у каждого advice и собирает результат.
- `lib/har/util.js` — утилиты (форматирование байтов/времени, проверки протоколов и т. п.).
- `lib/har/thirdParty.js` — разбор third-party запросов (на базе `third-party-web`).
- `lib/har/harCutter.js` — `pickAPage()` (выбор страницы из HAR).
- `lib/har/categories.json`, `lib/har/groups.json` — метаданные/группировки категорий.

Ссылка на папку в GitHub UI:  
https://github.com/sitespeedio/coach-core/tree/main/lib/har

## 2) Как выполняются HAR‑правила (`lib/har/index.js`)
Файл: https://github.com/sitespeedio/coach-core/blob/main/lib/har/index.js

Логика такая:
- На вход приходит:
  - `pages` (это результат `pagexray.convert(harJson, { includeAssets: true, firstParty: ... })`)
  - `harAdvicesByCategory` — объект вида `{ performance: [advice1, advice2...], bestpractice: [...], info: [...] }`
  - `domAdvice` — результат DOM‑анализа (опционально)
  - `options`
- Для каждой `page` и каждой категории (кроме `info`) берутся advice и выполняется:
  - `advice.processPage(page, domAdvice, options)`
- Результат складывается в структуру:
  - `results[category].adviceList[advice.id] = { title, description, advice, score, offending, weight, tags }`
- Дополнительно в `info` добавляются общие цифры по странице (размеры, количество запросов, статистика expires/last-modified/cookies) и third-party статистика.

Важно: у каждого advice обязательно должны быть:
- `id`
- `processPage()` (иначе раннер бросит ошибку)

## 3) Пример конкретных правил из `lib/har/performance/`
Я сделал выборку из папки `lib/har/performance`. **Важно:** результаты поиска кода ограничены (показывается не всё); полный список смотрите в GitHub UI:  
https://github.com/sitespeedio/coach-core/tree/main/lib/har/performance

Несколько примеров правил (что проверяют и как устроены):

- `compressAssets.js`  
  Проверяет, что текстовые типы (html/plain/json/js/css/svg) отдаются с `content-encoding` (`gzip/br/deflate/zstd`) если `contentSize > 2000`.  
  Если нет — снижает score и добавляет offending (url + размеры).  
  https://github.com/sitespeedio/coach-core/blob/main/lib/har/performance/compressAssets.js

- `pageSize.js`  
  Если общий `page.transferSize` больше лимита (1MB mobile, 2MB desktop) — score = 0, а offending содержит все ассеты с размерами.  
  https://github.com/sitespeedio/coach-core/blob/main/lib/har/performance/pageSize.js

- `avoidRenderBlocking.js`  
  В Chrome/Edge использует данные `page.renderBlocking` и помечает blocking/potentially_blocking ресурсы, снижая score.  
  https://github.com/sitespeedio/coach-core/blob/main/lib/har/performance/avoidRenderBlocking.js

- `cssSize.js`, `javascriptSize.js`, `imageSize.js`  
  Суммируют размеры ассетов по типам и сравнивают с лимитами, формируют advice и offending.  
  Пример CSS: https://github.com/sitespeedio/coach-core/blob/main/lib/har/performance/cssSize.js

- `cacheHeadersLong.js`, `privateAssets.js`  
  Проверки кэширования (expires/cache-control), исключения для некоторых доменов, штрафы за `private` для статики.  
  https://github.com/sitespeedio/coach-core/blob/main/lib/har/performance/cacheHeadersLong.js  
  https://github.com/sitespeedio/coach-core/blob/main/lib/har/performance/privateAssets.js

Если скажете, что именно показать дальше:
1) правила из `privacy` или `bestpractice`, или  
2) пример “вход page (из pagexray)” и что там за поля (`assets`, `transferSize`, `expires`, `headers`, `renderBlocking`),  
— я раскрою это на конкретных файлах/структурах из репо.