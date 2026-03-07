---

## DuckDuckGo — Полный технический анализ

---

### 1. Инфраструктура и рендеринг

| Параметр | Значение |
|----------|----------|
| **Рендеринг** | SSR + React гидратация (initial HTML + client-side React) |
| **Тип пагинации** | **Infinite Scroll / "More Results"** — `links.duckduckgo.com/d.js` JSONP |
| **Протокол** | HTTP/2 (`h2`) |
| **Сервер** | `nginx` |
| **JS-фреймворк** | **React** (`data-handled-by-react=true`) + собственный DDG framework |
| **Поисковой бэкенд** | **Microsoft Bing API v7** (`DDG.deep.upstream = "bingv7aa"`) |
| **transferSize** | ~7 KB (сжатый Brotli) — очень легко! |
| **decodedBodySize** | ~21 KB (SSR HTML с первой порцией результатов) |
| **domInteractive** | ~2408 ms |

---

### 2. Заголовки запроса (браузер → DDG)

```
GET /?q=apple+ipad&ia=web HTTP/2
Host: duckduckgo.com
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Sec-CH-UA: "Chromium";v="..."
Cookie: [s=..., ay=b, ...]
```

Важно: DDG **не запрашивает** расширенные Client Hints (нет `accept-ch` в ответе).

---

### 3. Заголовки ответа (DDG → браузер)

HTTP 200, 18 заголовков:

| Заголовок | Значение |
|-----------|----------|
| `server` | `nginx` |
| `cache-control` | `max-age=1` |
| `content-encoding` | `br` (Brotli) |
| `content-type` | `text/html; charset=UTF-8` |
| `vary` | `Accept-Encoding` |
| `expires` | `[now + 1s]` (практически не кэшируется) |
| `x-frame-options` | `SAMEORIGIN` |
| `x-content-type-options` | `nosniff` |
| `x-xss-protection` | `1; mode=block` |
| `referrer-policy` | `origin` (только домен в Referer — конфиденциальность!) |
| `strict-transport-security` | `max-age=31536000` |
| `expect-ct` | `max-age=0` |
| `permissions-policy` | `interest-cohort=()` (отключает FLoC!) |
| `x-duckduckgo-locale` | `ru_RU` |
| `x-duckduckgo-results` | `1` (флаг наличия результатов) |
| `server-timing` | `[internal timing]` |
| `content-security-policy` | `[политика]` |

Уникальные заголовки: `x-duckduckgo-locale`, `x-duckduckgo-results`, `permissions-policy: interest-cohort=()`.

---

### 4. Механизм пагинации — **КЛЮЧЕВОЙ МОМЕНТ**

DDG использует совершенно другой подход: **Infinite Scroll через `links.duckduckgo.com/d.js` (JSONP)**. Никакого full reload, никакого классического AJAX.

**Архитектура:**

```
1. Страница загружается → SSR HTML с ~10 результатами
2. Сразу запрашивается первый d.js (s=0) через <link rel="preload" as="script">
3. При клике "Больше результатов" → следующий d.js (s=10, s=25, ...)
4. d.js — JSONP-файл: window.execDeep = function() { DDG.deep.deepPayload = {...} }
5. React вставляет новые результаты в DOM без перезагрузки
```

**Endpoint:**

```
GET https://links.duckduckgo.com/d.js
  ?q=apple+ipad
  &kl=wt-wt                ← locale (wt-wt = worldwide)
  &l=wt-wt                 ← lang/region
  &s=10                    ← OFFSET (смещение результатов)
  &ct=UA                   ← client type (User Agent)
  &vqd=[41chars]           ← верификационный токен (CSRF-like, привязан к запросу)
  &bing_market=en-US       ← Bing market параметр (!)
  &p_ent=                  ← preferred entity
  &ex=-2                   ← experiment flag
  &dp=[base64-sig]         ← digital payload (криптоподпись сессии)
  &perf_id=2f2103c0...     ← ID для perf трекинга
  &parent_perf_id=47b0dd.. ← родительский perf ID
  &perf_sampled=0          ← сэмплирование
  &host_region=euw         ← регион (euw = Europe West)
  &sp=0                    ← start page (1 на первом, 0 на следующих)
  &dfrsp=1                 ← deep first result start page (1 на первом)
  &wrap=1                  ← wrap results
  &aps=0                   ← auto page scroll
  &biaexp=b &litexp=b ...  ← A/B experiment flags
```

**Прогрессия смещения `s=`:**

| Запрос | `s=` | Способ загрузки | Результатов |
|--------|------|-----------------|-------------|
| 1 | `0` | `<link rel="preload">` (авто при загрузке) | ~10 |
| 2 | `10` | JS (клик "Ещё") | +~12-14 |
| 3 | `25` | JS | +~12-14 |
| 4 | `40` | JS | +~12-14 |
| 5 | `55` | JS | +~12-15 |

---

### 5. Формат d.js (JSONP-ответ)

```javascript
window.execDeep = function() {
  DDG.search.altIsNavigational = false;
  DDG.deep.adUnitIndex = 0;
  DDG.deep.setUpstream("bingv7aa");       // ← Bing API v7!
  DDG.deep.deepPayload = {
    instantAnswers: [{
      data: { action: "answer", answer: "The iPad is a versatile tablet..." },
      // WikiNLP instant answer
    }],
    // + органические результаты, рекламные блоки
  };
}
```

---

### 6. Структура данных результатов (`DDG.deep.results`)

```javascript
DDG.deep.results = {
  a: [],          // ads (рекламные результаты)
  d: [            // organic results (70 накопленных)
    {
      u: "https://www.apple.com/ipad/",   // ← URL сайта (прямой!)
      t: "iPad - Apple",                   // title
      d: "www.apple.com/ipad/",            // display URL
      a: "Explore every <b>iPad</b>...",   // snippet (HTML)
      c: "https://www.apple.com/ipad/",    // canonical URL
      i: "www.apple.com",                  // icon domain → /ip3/{i}.ico
      l: [                                 // site links
        { text: "Compare", targetUrl: "https://www.apple.com/ipad/compare/", snippet: "..." },
        { text: "iPad Air", targetUrl: "https://www.apple.com/ipad-air/", snippet: "..." },
        // ...
      ],
      k: ..., m: ..., o: ..., p: ..., s: ..., sn: ...,  // metadata
      side: ...,   // sidebar position
    }
  ]
}
```

**Ключевое: `u` содержит прямой URL без редиректа!**

---

### 7. Где живут ссылки результатов

**DOM-селектор:**
```css
article[data-testid="result"] h2 a[data-testid="result-title-a"]
```

**Атрибуты ссылки:**
```html
<a
  href="https://www.apple.com/ipad/"     ← ПРЯМОЙ URL
  data-testid="result-title-a"           ← идентификатор
  data-handled-by-react="true"           ← React обрабатывает клик
  rel="noopener"
  target="_self"
  class="eVNpHGjtxRBq_gLOfGDr ..."     ← hashed CSS (Webpack)
>
```

Источник данных в `d.js`: поле `u` объекта результата.

**В сыром JS-объекте:** `DDG.deep.results.d[N].u` — прямой `https://...` URL.

---

### 8. Автодополнение

```
GET /ac/?q=apple+ipad&type=list HTTP/2
Host: duckduckgo.com
```

**Response (HTTP 200):**
```json
[
  "apple ipad",
  [
    "apple ipad",
    "apple ipad air",
    "apple ipad pro",
    "apple ipad 2025",
    "apple ipad 11",
    "apple ipad air 13",
    "apple ipad a16",
    "apple ipad mini"
  ]
]
```

Формат: **OpenSearch Suggestions** (стандартный — `[query, [suggestions...]]`). Чистый JSON, без XSSI-защиты.

Уникальный ответный заголовок: `x-duckduckgo-privacy-random-ac: [273 chars base64]` — добавляет случайный шум для защиты от fingerprinting автодополнения.

**Заголовки autocomplete:** `cache-control: no-cache`, `server: nginx`, `content-encoding: br`.

---

### 9. Телеметрия и Analytics (`improving.duckduckgo.com/t/*`)

Все беконы уходят на `improving.duckduckgo.com` через `navigator.sendBeacon()`:

| Endpoint | Назначение | Ключевые параметры |
|----------|------------|-------------------|
| `/e` | POST-бикон (page events) | тело POST, не query params |
| `/t/si` | Search Impression | `b=chrome, l=ru_RU, p=mac, pre_atb=v524-4, blay=...` |
| `/t/perf` | Производительность | `transfer_time_ms, ttfb_ms, resource=/d.js, page=serp` |
| `/t/moreresults` | Клик "Ещё результатов" | experiment flags |
| `/t/adsummary` | Итоги рекламного блока | — |
| `/t/apss_f` | Auto-Page-Scroll финиш | — |
| `/t/wide_event_serp-web-vertical_load` | Вертикаль "Web" загружена | — |
| `/t/ias_web`, `/t/ias_images`, `/t/ias_news` ... | Instant Answer Status | — |
| `/t/iaoi_wikinlp` | IA impression (WikiNLP) | — |
| `/t/deep_request_success_from_preload_200_1` | Preload d.js успешен | `duration=491ms` |
| `/t/deep_request_success_from_js_200_N` | JS d.js запрос N успешен | `duration=~700ms` |

---

### 10. JS-глобалы

```javascript
window.DDG = {
  Data: {
    Settings: {          // настройки: k1, k5, kl, kp и 80+ "k" параметров
      k1: { default:"1" },   // ad targeting
      kp: { default:"-1" },  // safe search
      // ...
    },
    HiddenFields: { DATE_FILTER:"df", DATE_SORT:"ds", IA_REQUERY:"iar" },
    Pixels: {            // типы аналитических пикселей
      abort:{}, ac:{once:true}, acp:{}, ad:{ct,kl,bingMarket,...}, ...
    },
    Experiments: {       // A/B тесты
      about_module:{}, stack_overflow:{}, spelling:{}, ...
    },
  },
  deep: {                // движок загрузки результатов
    results: { a:[], d:[] },   // ads + organic
    upstream: "bingv7aa",      // ← BING API v7
    pageNumber: 5,             // текущая страница
    event: "load:completed",
    signalSummary: "wikinlp:l",
    pageLayoutSummary: "w6rqa1w4r1,e1",
  },
  services: {
    autocomplete: { path:"/ac/", useSameHost:true },
    icons:        { sub:"external-content", path:"/ip3/" },
    pixels:       { sub:"improving", path:"/t/" },
    local:        { path:"/local.js?q=", useSameHost:true },
  },
  pixel: { _sentPixels: [...] },
  deepRequestsLogger: { ... },
}

window.React  // React (version from bundle)
```

---

### 11. Субдомены DDG

| Домен | Назначение |
|-------|-----------|
| `duckduckgo.com` | Основной SERP, автодополнение `/ac/` |
| `links.duckduckgo.com` | `/d.js` — JSONP результаты поиска |
| `improving.duckduckgo.com` | `/t/*` — аналитика, беконы, пиксели |
| `external-content.duckduckgo.com` | `/ip3/{domain}.ico` — прокси favicon'ов |

---

### 12. Полная сравнительная таблица: Google vs Bing vs Yahoo vs DuckDuckGo

| Критерий | Google | Microsoft Bing | Yahoo! | **DuckDuckGo** |
|----------|--------|----------------|--------|----------------|
| **Рендеринг** | SSR HTML | SSR HTML | SSR HTML | **SSR + React** |
| **Пагинация** | Full reload | **SPA AJAX** (`snrjson`) | Full reload | **Infinite Scroll** (`d.js` JSONP) |
| **Пагинация endpoint** | `?start=N` | `?first=N format=snrjson` | `?b=N&pz=7` | `links.duckduckgo.com/d.js?s=N` |
| **Пагинация формат** | HTML full page | JSON (`AjaxCB[]()`) | HTML full page | **JSONP** `window.execDeep` |
| **URL при пагинации** | Меняется | Меняется | Меняется | **НЕ меняется!** |
| **Протокол** | HTTP/2 | HTTP/2 | HTTP/2 | HTTP/2 |
| **Server** | `gws` | `Microsoft-IIS/10.0` | `ATS` | **`nginx`** |
| **Бэкенд** | Google | Microsoft | Microsoft Bing | **Microsoft Bing v7** |
| **Кодирование** | `br` | `br` | `br` | `br` |
| **href результата** | Прямой | **Обёртка `/ck/a?u=a1[B64]`** | Прямой | Прямой |
| **JS-данные** | `google.*`, `rwt()` | `window._G` | `window.YAHOO.*` | **`DDG.deep.results.d[N].u`** |
| **Ссылки в JS** | Нет (только HTML) | Нет (только HTML) | Нет (только HTML) | **ДА: `d.js` содержит все URL** |
| **Автодополнение** | `/complete/search` JSON + `)]}'` | `/AS/Suggestions` **HTML** | `/sugg/gossip/...` JSON | `/ac/?type=list` **OpenSearch JSON** |
| **Аналитика домен** | google.com | bing.com | improving.yahoo.com | **improving.duckduckgo.com** |
| **Tracking clicks** | `ping=` attribute | `/ck/a` redirect | `data-b20` + `/beacon/sbac` | `improving.duckduckgo.com/t/*` (без redirect) |
| **Favicon прокси** | Нет | Нет | Нет | **`external-content.duckduckgo.com/ip3/`** |
| **cache-control** | `private` | `private` | `private` | **`max-age=1`** (публичный, почти без кэша) |
| **referrer-policy** | `no-referrer-when-downgrade` | (default) | `no-referrer-when-downgrade` | **`origin`** (только домен) |
| **Блокировка FLoC** | Нет | Нет | Нет | **ДА: `permissions-policy: interest-cohort=()`** |
| **XSSI защита** | Да (`)]}'`) | Нет | Нет | Нет |
| **Privacy токен** | Нет | Нет | Нет | **`x-duckduckgo-privacy-random-ac`** в AC |

---

### Как достать ссылки программно из DDG

**Вариант 1 — через HTML (парсинг):**
```python
links = soup.select('article[data-testid="result"] h2 a[data-testid="result-title-a"]')
for link in links:
    url = link['href']  # прямой https://...
```

**Вариант 2 — через d.js API (предпочтительно):**
```python
import requests, re, json

# 1. Получить vqd токен из главной страницы
resp = requests.get('https://duckduckgo.com/', params={'q': 'apple ipad'})
vqd = re.search(r'vqd=([\d-]+)', resp.text).group(1)

# 2. Запросить d.js
djs = requests.get('https://links.duckduckgo.com/d.js', params={
    'q': 'apple ipad', 'kl': 'us-en', 's': 0, 'vqd': vqd
})
# Ответ: window.execDeep = function() { DDG.deep.deepPayload = {...} }
# Парсить объект deepPayload → results.d[N].u
```
