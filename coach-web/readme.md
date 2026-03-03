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