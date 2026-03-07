Here's the full breakdown of how **Google Search** (the SPA) loads its listings and handles pagination for "apple ipad":

---

## How Google Search Loads Listings

### 1. It's NOT a True SPA for Pagination

Despite Google Search looking like a SPA, **pagination uses full page reloads (MPA-style navigation)**, not client-side pushState routing. This was confirmed by:

```
performance.navigation.type = "navigate"   ← full browser navigation
transferSize = ~152 KB compressed HTML
encodedBodySize = 151,896 bytes
```

Every time you click a page number, the browser makes a **full HTTP GET** request for a new server-rendered HTML document.

---

### 2. Listings Are Server-Side Rendered (SSR)

All search results — organic listings, sponsored products, shopping cards — arrive **pre-rendered in the initial HTML response** (~739 KB uncompressed). The page contains 100 `[data-hveid]` result elements already in the DOM when it loads, with no client-side fetch needed to populate them.

---

### 3. Pagination URL Scheme

Pagination is controlled by two key query parameters:

| Parameter | Meaning | Example |
|---|---|---|
| `q` | Search query | `apple+ipad` |
| `start` | Result offset (0-indexed) | `0`, `10`, `20`… |
| `num` | Results per page | `10` |

So the pages map like this:
- **Page 1:** `?q=apple+ipad&start=0&num=10`
- **Page 2:** `?q=apple+ipad&start=10&num=10`
- **Page 3:** `?q=apple+ipad&start=20&num=10`

The "Goooooooogle" pagination bar simply renders anchor `<a>` tags with pre-calculated `start=` values. No JavaScript routing is involved.

---

### 4. Async / Lazy-Loaded Widgets (The SPA Part)

While the main results are SSR, **some secondary widgets** are loaded asynchronously after page load via XHR, using Google's internal `data-async-type` attribute system:

```
XHR  www.google.com/async/bgasy          ← background async widget updater
XHR  ogads-pa.clients6.google.com/$rpc/  ← async ad data (GetAsyncData)
XHR  www.google.com/complete/search      ← autocomplete suggestions
```

Widgets with these types are lazy-filled post-load: `duffy3`, `kp_feedback`, `ctxm`, `arc`, `lbsc`, `vpkg`, etc. These are sidebars, feedback panels, and knowledge cards — **not** the main search result listings.

---

### 5. JavaScript Framework

Google uses its own custom framework called **Closure + JSAction** (not React/Vue/Angular):
- `jscontroller="Eox39d"` on `<body>` — main search page controller
- `jsaction` attributes on interactive elements — event delegation system
- `window.google`, `window.gbar`, `window.xjs` — Google's proprietary globals
- JS bundles loaded via `fetch` from `/xjs/_/js/...` (module system)

---

### Summary Diagram

```
User clicks "Page 3"
       ↓
Browser does full GET /search?q=apple+ipad&start=20&num=10
       ↓
Google server returns complete SSR HTML (~150KB gzipped)
  ├─ Sponsored product carousel  ← in HTML
  ├─ Organic result listings      ← in HTML (data-hveid="...")
  └─ Pagination bar (start=0..90) ← in HTML (<a href="?start=N">)
       ↓
After load: XHR calls fire asynchronously
  ├─ /async/bgasy  → fills sidebar widgets
  └─ /complete/search → warms autocomplete cache
```

The bottom line: Google Search is **server-rendered with async widget hydration** — not a classic SPA. The listings and pagination are entirely traditional SSR; the "SPA feel" comes from the fast server responses and minimal page chrome reloading, not client-side routing.

Вот полный разбор — что браузер **шлёт** Google и что Google **отдаёт** в ответ, по каждому типу запроса.

---

## 1. Главный запрос — `GET /search` (загрузка страницы результатов)

### → БРАУЗЕР ШЛЁТ (Request Headers)

```http
GET /search?q=apple+ipad&num=10&start=0 HTTP/2
Host: www.google.com

# Стандартные браузерные заголовки:
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7
Accept-Encoding: gzip, deflate, br, zstd
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
            AppleWebKit/537.36 (KHTML, like Gecko)
            Chrome/145.0.0.0 Safari/537.36

# Sec-Fetch (политика безопасности):
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document

# Client Hints (UA) — шлются потому что сервер запросил через Accept-CH:
Sec-CH-UA: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"
Sec-CH-UA-Mobile: ?0
Sec-CH-UA-Platform: "macOS"
Sec-CH-UA-Platform-Version: "26.3.0"
Sec-CH-UA-Arch: "arm"
Sec-CH-UA-Bitness: "64"
Sec-CH-UA-Full-Version: "145.0.7632.160"
Sec-CH-UA-Full-Version-List: "Not:A-Brand";v="99.0.0.0",
                              "Google Chrome";v="145.0.7632.160",
                              "Chromium";v="145.0.7632.160"
Sec-CH-UA-WoW64: ?0

# Network hints:
Downlink: 10        ← скорость соединения (Mbps)
RTT: 50             ← задержка (ms)

# Авторизация:
Cookie: <session cookies>
```

**URL Query Parameters:**

| Параметр | Значение | Описание |
|---|---|---|
| `q` | `apple+ipad` | Поисковый запрос |
| `num` | `10` | Результатов на странице |
| `start` | `0`, `10`, `20`… | Смещение (пагинация) |
| `hl` | `en-UA` | Язык интерфейса |
| `ei` | `oFOsaY2cH7...` | Event ID (ID сессии запроса) |
| `sxsrf` | `ANbL-n6D...` | XSS-токен (CSRF-защита) |
| `biw` / `bih` | `1062` / `782` | Ширина/высота вьюпорта |
| `dpr` | `2` | Device pixel ratio |
| `sa` | `N` | Источник навигации |
| `ved` | `2ahUKEwj...` | Encoded event data (клик-трекинг) |

---

### ← GOOGLE ОТДАЁТ (Response Headers)

```http
HTTP/2 200 OK
server: gws                         ← Google Web Server

# Кэширование — страница НИКОГДА не кэшируется:
cache-control: private, max-age=0
expires: -1

# Сжатие:
content-encoding: br                ← Brotli (~107KB → ~451KB uncompressed)

# Безопасность:
strict-transport-security: max-age=31536000
x-frame-options: SAMEORIGIN
x-xss-protection: 0                 ← отключён (заменён на CSP)
permissions-policy: unload=()
cross-origin-opener-policy: same-origin-allow-popups

# CSP — защита от инъекций скриптов:
content-security-policy: object-src 'none';
  base-uri 'self';
  script-src 'nonce-Ym2xNI1g...' 'strict-dynamic' 'unsafe-eval'
             'unsafe-inline' https: http:;
  report-uri https://csp.withgoogle.com/csp/gws/cdt1

# Запрашивает дополнительные Client Hints на следующие запросы:
accept-ch: Sec-CH-Prefers-Color-Scheme, Downlink, RTT,
           Sec-CH-UA-Form-Factors, Sec-CH-UA-Platform,
           Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version,
           Sec-CH-UA-Arch, Sec-CH-UA-Model, Sec-CH-UA-Bitness,
           Sec-CH-UA-Full-Version-List, Sec-CH-UA-WoW64

# Мониторинг/репортинг ошибок:
report-to: {"group":"gws","max_age":2592000,
            "endpoints":[{"url":"https://csp.withgoogle.com/csp/report-to/gws/cdt1"}]}
```

**Тело ответа:** полностью рендеренный HTML (~107 KB br → ~451 KB HTML), все результаты внутри.

---

## 2. Автодополнение — `XHR GET /complete/search`

### → БРАУЗЕР ШЛЁТ

```http
GET /complete/search?q=apple+ipad
  &cp=0               ← cursor position
  &client=gws-wiz-serp
  &xssi=t             ← добавляет )]}' в начало ответа (защита от JSON hijacking)
  &hl=en-UA
  &authuser=0
  &pq=apple+ipad      ← предыдущий запрос
  &psi=Ilasafr6...    ← session ID
  &dpr=2
  &num=10
  &nolsbt=1

X-Search-Ci-Fi: 1
X-DoS-Behavior: 5
```

### ← GOOGLE ОТДАЁТ

```http
cache-control: no-cache, must-revalidate
pragma: no-cache
expires: -1
x-content-type-options: nosniff
```

**Тело ответа** (JSON, защищённый `)]}'`):
```javascript
)]}'
[["apple ipad",35,[512,39,650], {"du":"/complete/deleteitems?...","zf":27}],
 ["apple ipad<b>pro</b>",0,[512,67,650]],
 ["apple ipad<b>air</b>",0,[512,67,650]],
 ["apple ipad<b>mini</b>",0,[512,67,650]],
 ["apple ipad<b>11</b>",0,[512,203]],
 ...10 подсказок...],
 {"n":0,"q":"pWw2KL181wCYY3e_..."}
]
```

Структура: `[запрос, тип, [флаги], {метаданные}]`. Первый `35` = история поиска пользователя.

---

## 3. Асинхронные виджеты — `XHR GET /async/bgasy`

### → БРАУЗЕР ШЛЁТ

```http
GET /async/bgasy?
  ei=oFOsaY2...      ← Event ID страницы
  &opi=89978449       ← OPI (origin product identifier = Google Search)
  &yv=3              ← версия протокола
  &cs=1              ← client state
  &async=_fmt:jspb   ← формат ответа (JSON Protocol Buffers)

X-Search-Ci-Fi: 1
X-DoS-Behavior: 5
X-Same-Domain: 1
```

### ← GOOGLE ОТДАЁТ

Заголовки ответа такие же как у `/search`. Тело — список виджетов в формате `jspb` (JSON-like protobuf), содержащий HTML-фрагменты для: `duffy3`, `kp_feedback`, `ctxm`, `arc`, `lbsc`, `vpkg` и др.

---

## 4. Телеметрия — `FETCH/XHR POST /log` и `/gen_204`

### → БРАУЗЕР ШЛЁТ

```http
POST /log?format=json&hasfast=true&authuser=0
Authorization: SAPISIDHASH <hash>
X-Goog-AuthUser: 0

# Тело (JSON array — данные о действиях пользователя):
[[
  1, null, null, null, null, null, null, null, null, null,
  [null, null, null, null, "en-UA", null, null, null,
    [[["Not:A-Brand","99"],["Google Chrome","145"],["Chromium","145"]],
     0, "macOS", "26.3.0", "arm", "", "145.0.7632.160"],
    [4, 0]  ← device type
  ]
],
704,  ← log source ID
[
  [timestamp, null, null, null, null, null, null, "<ved_data>",
   null, null, null, null, null, null, -7200, ...]
]
]
```

### ← GOOGLE ОТДАЁТ

```http
access-control-allow-origin: *
content-length: 0
HTTP 200 / 204
```

---

## 5. Рекламные данные — `XHR POST ogads-pa.clients6.google.com`

```http
POST /$rpc/google.internal.onegoogle.asyncdata.v1.AsyncDataService/GetAsyncData
Content-Type: application/json+protobuf
X-Goog-AuthUser: 0
Authorization: SAPISIDHASH <hash>
```

Это gRPC-Web вызов — подгружает данные для рекламного блока (Shopping carousel) асинхронно после загрузки страницы.

---

## Итоговая схема объектов

```
БРАУЗЕР                              GOOGLE (gws)
───────────────────────────────────────────────────
GET /search?q=...&start=N            200 HTML (SSR, br-сжатый)
  + User-Agent                    ←  + cache-control: private
  + Accept-CH hints                  + accept-ch: Sec-CH-UA-*
  + Cookie (session)                 + CSP nonce
  + Sec-Fetch-*                      + HSTS, X-Frame-Options

XHR GET /complete/search?q=...       200 JSON (XSSI-защита )]}'
  + client=gws-wiz-serp           ←  + no-cache headers
  + pq= (prev query)                 + suggestions array

XHR GET /async/bgasy?_fmt=jspb       200 jspb widgets HTML
  + ei= (event id)                ←  + server: gws
  + X-Same-Domain: 1

POST /log?format=json                200/204 пустой
  + Authorization: SAPISIDHASH    ←  + CORS: allow *
  + body: [[UA, platform, events]]

POST ogads-pa.../GetAsyncData        200 protobuf
  + Authorization: SAPISIDHASH   ←  + ads data
```

Ответ прямой: **ссылки сайтов лежат прямо в HTML-теле ответа на главный GET-запрос** `/search?q=...`. Никаких отдельных API-вызовов для получения ссылок нет.

---

## Где именно в ответе

### В сыром HTML (ответ на `GET /search?q=apple+ipad`)

Google возвращает `<a>` теги с **прямыми href** на сайты — без оберток `/url?q=`:

```html
<a jsname="UWckNb" class="zReHs" href="https://www.apple.com/ua/ipad/"
   data-ved="2ahUKEwj6k8Kqno..." ping="/url?sa=t&source=web...">
  <h3 class="LC20lb">iPad - Apple (UA)</h3>
</a>

<a jsname="UWckNb" class="zReHs" href="https://jabko.ua/ipad/"
   data-ved="..." ping="...">
  <h3>Apple iPad — купити в Ябко від 12 499 грн</h3>
</a>

<a jsname="UWckNb" class="zReHs" href="https://www.apple.com/ua/ipad-pro/"
   data-ved="..." ping="...">
```

---

## Схема атрибутов тега-результата

| Атрибут | Значение | Назначение |
|---|---|---|
| `href` | `https://jabko.ua/ipad/` | ✅ **Сам URL сайта** — вот он |
| `jsname` | `UWckNb` | Идентификатор типа элемента (органика) |
| `class` | `zReHs` | CSS-класс (может меняться) |
| `data-ved` | `2ahUKEwj6k8...` | Encoded position/click tracking |
| `ping` | `/url?sa=t&source=web...` | Click-трекинг (Google логирует клик отдельным запросом) |

---

## Как вытащить все ссылки

Прямо из DOM по `jsname="UWckNb"`:

```javascript
// Все органические результаты
document.querySelectorAll('a[jsname="UWckNb"]')
  .forEach(a => console.log(a.href))

// → https://www.apple.com/ua/ipad/
// → https://jabko.ua/ipad/
// → https://www.apple.com/ua/ipad-pro/
// → https://www.apple.com/ipad/
// → https://www.macworld.com/...
// → https://rozetka.com.ua/ua/tablets/...
// → ...итого 8 на странице
```

Или из сырого HTML-ответа регуляркой:

```javascript
// В тексте HTML ищешь:
html.match(/jsname="UWckNb"[^>]*href="([^"]+)"/g)
// Отдаёт: href="https://www.apple.com/ua/ipad/", href="https://jabko.ua/..."
```

---

## Важный нюанс: `/url?q=` vs прямой `href`

Раньше (до ~2019) Google оборачивал все ссылки в редирект `/url?q=https://site.com&...`, чтобы отслеживать клики. Сейчас — **кладёт прямой URL в `href`**, а трекинг делает через атрибут `ping=` (браузер автоматически шлёт POST на этот URL при клике, не блокируя переход). Поэтому в HTML уже есть чистый URL без обёрток.
