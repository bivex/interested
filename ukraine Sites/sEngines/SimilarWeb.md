---

## SimilarWeb — Полный технический анализ

---

### 1. Инфраструктура и рендеринг

| Параметр | Значение |
|----------|----------|
| **Рендеринг** | **SSR (Server-Side Rendering)** — данные в `window.__APP_DATA__` в теле HTML |
| **JS-фреймворк** | **React 17.0.2** (CDN: `static-us-east-1.similarcdn.com`) |
| **Тип пагинации** | **Нет пагинации** — top-websites показывает 50 сайтов фиксированно; фильтрация — full reload по URL |
| **Протокол** | HTTP/2 (`h2`) |
| **CDN** | **AWS CloudFront** |
| **WAF** | **AWS WAF** (`7ef1a1ef43ff.edge.sdk.awswaf.com`) — CAPTCHA + fingerprint |
| **Build version** | `20260301.master.9201c9f` |
| **Кодирование** | **gzip** (не Brotli — в отличие от Google/Bing/Yahoo/DDG) |
| **transferSize** | ~155 KB (top-websites) / ~203 KB (website profile) |
| **decodedBodySize** | ~641 KB (top-websites) / ~865 KB (website profile) — огромные SSR страницы |

---

### 2. Заголовки запроса (браузер → SimilarWeb)

```
GET /website/apple.com/ HTTP/2
Host: www.similarweb.com
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Cookie: [awswaf session, tracking cookies]
```

---

### 3. Заголовки ответа (SimilarWeb → браузер)

**HTML страницы** (нормальный ответ):

| Заголовок | Значение |
|-----------|----------|
| `server` | `CloudFront` |
| `via` | `1.1 [hash].cloudfront.net (CloudFront)` |
| `x-amz-cf-pop` | `WAW51-P6` (Warsaw PoP — ближайший CDN-узел) |
| `x-cache` | `Miss from cloudfront` / `Hit from cloudfront` |
| `x-amzn-waf-action` | `allow` / `captcha` / `block` ← **WAF статус** |
| `content-encoding` | `gzip` |
| `content-type` | `text/html; charset=UTF-8` |
| `vary` | `accept-encoding` |
| `cache-control` | `no-store, max-age=0` (персонализированный контент — не кэшируется) |
| `access-control-allow-origin` | `*` |
| `access-control-allow-methods` | `OPTIONS,GET,POST` |
| `access-control-expose-headers` | `x-amzn-waf-action` ← явно экспонирует WAF-статус |
| `strict-transport-security` | `max-age=...` |
| `content-security-policy` | `[политика]` |

**API `/api/universal` (autocomplete/search)**:

Те же CloudFront заголовки + `vary: accept-encoding, Origin`.

---

### 4. Архитектура данных — `window.__APP_DATA__`

**Это главный механизм SW.** Весь контент страницы — в одном inline JSON объекте, инжектированном в HTML сервером:

```javascript
window.__APP_DATA__ = {
  header: {
    identity: null,          // null = не авторизован
    buildVersion: "20260301.master.9201c9f",
    localeId: "en",
    country: "UA",           // страна посетителя
    mode: "light",
    sgId: "fc8f21a5-...",    // session/group ID
    isMatomoTrackingEnabled: true,
    isAsyncAuthentication: false,
    swUrls: {
      logoutEndpoint: "https://secure.similarweb.com/account/logout",
      loginEndpoint: "https://secure.similarweb.com/account/login/default",
      proWebsite: "https://pro.similarweb.com",
      liteWebsite: "https://www.similarweb.com",
      accountWebsite: "https://account.similarweb.com",
      i18BaseUrl: "https://gro.similarweb.com",
    }
  },
  layout: {
    data: { /* все данные страницы */ },
    i18n: { /* переводы */ },
    origin: "https://www.similarweb.com",
    isLimited: false,        // true = paywall
    views: { daily: 1, weekly: 1 }
  },
  footer: { /* footer data */ }
};
```

---

### 5. Структура данных `/top-websites/`

```javascript
window.__APP_DATA__.layout.data = {
  categoryId: "*",           // * = all categories
  countryAlpha2Code: "*",    // * = worldwide
  snapshotDate: "2026-01-01T00:00:00+00:00",
  categories: [...],         // 26 категорий
  countries: [...],          // 60 стран
  sites: [                   // 50 сайтов
    {
      domain: "google.com",
      favicon: "...",
      rankChange: 0,
      categoryId: "...",
      visitsAvgDurationFormatted: "00:10:10",
      pagesPerVisit: 8.516,
      bounceRate: 0.2836,     // 28.36%
      isBlackListed: false,
      isNewRank: false
    },
    // ... 49 других
  ]
}
```

**URL-паттерн фильтрации (full reload — не AJAX):**

```
/top-websites/                              → все категории, весь мир
/top-websites/{category-slug}/             → фильтр по категории
/top-websites/{category-slug}/{country}/   → фильтр по категории + стране
/top-websites/trending/                    → трендовые сайты
```

---

### 6. Структура данных `/website/{domain}/`

```javascript
window.__APP_DATA__.layout.data = {
  domain: "apple.com",
  categoryId: "computers_electronics_and_technology/consumer_electronics",
  snapshotDate: "2026-01-01T00:00:00+00:00",
  overview: {
    globalRank: 75,
    globalRankChange: -2,
    countryAlpha2Code: "US",
    countryRank: 60,
    visitsTotalCount: 530542800,
    bounceRate: 0.529,
    pagesPerVisit: 3.206,
    visitsAvgDurationFormatted: "00:02:22",
    companyName: "Apple",
    companyYearFounded: 1976,
    companyEmployeesMin: 10001,
    companyRevenueMin: 1000000000,
    companyRevenueMax: 10000000000,
  },
  traffic: {
    visitsTotalCount: 530542800,
    visitsTotalCountChange: ...,
    history: [...],           // monthly traffic history
  },
  trafficSources: [
    { source: "direct",   percentage: 0.4795 },
    { source: "organic",  percentage: null },  // paywalled
    { source: "referrals",percentage: null },
    { source: "paid",     percentage: null },
    { source: "social",   percentage: null },
  ],
  searchesSource: {
    organicSearchShare: 0.925,
    keywordsTotalCount: 10181064,
    topKeywords: [
      { name: "apple", cpc: 0.55 },
      { name: "apple tv", cpc: 1.12 },
      // ...
    ]
  },
  geography: {
    countriesTotalCount: 183,
    topCountriesTraffics: [
      { countryAlpha2Code: "US", visitsShare: 0.329 },
      { countryAlpha2Code: "JP", visitsShare: 0.051 },
      // ...
    ]
  },
  competitors: [...],
  technologies: [...],
  ranking: { globalRank, globalRankHistory, ... },
  demographics: { ... },
  interests: [...],
  incomingReferrals: [...],
  outgoingReferrals: [...],
}
```

---

### 7. Навигация на странице профиля — hash anchors

Нижняя панель навигации использует **якорные ссылки** (не SPA-роуты, не AJAX):

```
#overview        → Overview секция
#ranking         → Ranking
#geography       → Audience (Geography)
#competitors     → Competitors
#traffic-sources → Marketing Channels
#outgoing-links  → Outgoing Links
#technologies    → Technologies
```

Страница профиля — **единый SSR HTML** с прокруткой к секциям. Никакого AJAX при переключении секций.

---

### 8. Единственный AJAX-эндпоинт — `/api/universal` (Autocomplete)

```
GET /api/universal?term=amazon&dataKeys=websites,apps,companies HTTP/2
Host: www.similarweb.com
```

**Response (HTTP 200, JSON):**

```json
{
  "websites": [
    { "name": "amazon.com", "image": "https://site-images.similarcdn.com/image?...", "isVirtual": false },
    { "name": "amazon.in",  "image": "...", "isVirtual": false },
    // 10 результатов
  ],
  "companies": [
    { "domain": "amazon.com", "name": "Amazon.com, Inc.", "logoUrl": "..." },
    // 10 результатов
  ],
  "apps": {
    "googlePlay": [
      { "id": "in.amazon.mShop.android.shopping", "name": "Amazon India...", "publisher": "...", "appKey": "...", "store": "googlePlay", "ratings": ..., "image": "..." },
    ],
    "appStore": [ /* аналогично */ ]
  }
}
```

**Ответные заголовки:** `content-encoding: gzip`, `via: CloudFront`, `vary: accept-encoding, Origin`.

---

### 9. Телеметрия, аналитика и безопасность

| Система | Домен | Эндпоинты | Назначение |
|---------|-------|-----------|-----------|
| **AWS WAF** | `7ef1a1ef43ff.edge.sdk.awswaf.com` | `/challenge.js`, `/telemetry`, `/inputs`, `/mp_verify` | Bot detection, CAPTCHA, fingerprinting |
| **GrowthBook** | `cdn.growthbook.io` | `/api/features/sdk-kdZC3ZLPEGSA0kiv` | A/B testing feature flags |
| **Matomo** | `matomo.cloudfront.similarweb.io` | `/sw-matomo-init.js` | First-party analytics (self-hosted Matomo via CloudFront) |
| **Google Tag Manager** | `www.googletagmanager.com` | `/gtm.js` | Tag management |
| **Silent Login** | `www.similarweb.com` | `/silent-login/` (iframe) | Cross-tab SSO session sync |
| **i18n** | `gro.similarweb.com` | `/i18n/similarweb_gaconnect/production/en-us/translation` | Translations |
| **Error reporting** | `www.similarweb.com` | `/api/exception` (POST) | Client-side error reporting |
| **FingerprintJS v2** | `cdn.jsdelivr.net` | `fingerprintjs2@2.1.4` | Device fingerprinting (используется WAF) |

**AWS WAF flow:**
```
1. challenge.js загружается → собирает browser fingerprint через FingerprintJS
2. /inputs → отправляет browser signals (mouse, keyboard entropy)  
3. /telemetry → отправляет телеметрию несколько раз (4× при загрузке)
4. /mp_verify → финальная верификация (math proof / PoW)
5. localStorage.awswaf_session_storage → кэшируется WAF-токен
6. localStorage.awswaf_token_refresh_timestamp → время последнего обновления
```

**GTM dataLayer события:**
```javascript
{ "0":"consent", "1":"default", "2": { "ad_storage":"denied", "analytics_storage":"denied", "region":["AT","BE",...] } }
{ "0":"consent", "1":"default", "2": { "ad_storage":"granted", "analytics_storage":"granted" } }
{ "event":"setUserCountry", "userCountry":"UA" }
{ "event":"popup/open" }  // когда показывается paywall
```

---

### 10. JS Globals и конфиг

```javascript
window.__APP_DATA__   // ← ОСНОВНОЙ: весь SSR-контент страницы
window.React          // React 17.0.2
window.dataLayer      // GTM dataLayer
window.Fingerprint2   // FingerprintJS v2 (загружен глобально)

// localStorage:
awswaf_session_storage        // WAF session token (UUID)
awswaf_token_refresh_timestamp // WAF token refresh time (unix ms)
gbFeaturesCache               // GrowthBook A/B test features cache

// GrowthBook feature flags:
"rcn-2087-get-started", "rcn-2140-date-picker", "promo-banner",
"centered-subheader-search", "rcn-2241-wa-overview",
"website-analysis-limit-by-period", "churn-prevention",
"google-one-tap-registration", "rcn-2431-ta-excel-hook", ...
```

---

### 11. Полная сравнительная таблица: Google vs Bing vs Yahoo vs DDG vs SimilarWeb

| Критерий | Google | Bing | Yahoo! | DDG | **SimilarWeb** |
|----------|--------|------|--------|-----|----------------|
| **Тип сайта** | Search engine | Search engine | Search engine | Search engine | **Analytics SaaS** |
| **Рендеринг** | SSR | SSR | SSR | SSR+React | **SSR+React 17** |
| **Пагинация** | Full reload | SPA AJAX | Full reload | Infinite Scroll | **Full reload (URL filter)** |
| **Данные** | HTML | HTML / snrjson | HTML | JSONP d.js | **`window.__APP_DATA__`** |
| **Протокол** | HTTP/2 | HTTP/2 | HTTP/2 | HTTP/2 | HTTP/2 |
| **CDN** | Google own | Akamai/Azure | ATS | nginx (own) | **AWS CloudFront** |
| **Server header** | `gws` | `Microsoft-IIS` | `ATS` | `nginx` | **`CloudFront`** |
| **Кодирование** | `br` | `br` | `br` | `br` | **`gzip`** |
| **WAF** | Google reCAPTCHA | — | — | — | **AWS WAF + CAPTCHA + PoW** |
| **Fingerprinting** | Нет | Нет | Нет | Нет | **FingerprintJS v2** |
| **A/B testing** | Internal | Internal | Internal | Internal DDG.Data.Experiments | **GrowthBook** |
| **Analytics** | Google Analytics | Internal | Yahoo Rapid | improving.duckduckgo.com | **Matomo (self-hosted) + GTM** |
| **Autocomplete** | `/complete/search` | `/AS/Suggestions` HTML | `/sugg/gossip/...` JSON | `/ac/` OpenSearch | **`/api/universal`** (websites+apps+companies) |
| **Ссылки результатов** | Direct href | `/ck/a?u=a1[B64]` | Direct href | Direct href | **`data.sites[N].domain` + `/website/{domain}/`** |
| **Paywall** | Нет | Нет | Нет | Нет | **Да (`isLimited: true`)** |
| **Auth** | Optional | Optional | Optional | Optional | **`/silent-login/` iframe SSO** |
| **localStorage** | — | — | — | — | **WAF токен + GrowthBook кэш** |
| **CDN POP** | — | — | — | — | **WAW51-P6 (Warsaw, Poland)** |

---

### Как получить данные программно

**Данные сайта из HTML:**
```python
import requests, re, json

resp = requests.get('https://www.similarweb.com/website/apple.com/', 
                    headers={'User-Agent': 'Mozilla/5.0 ...'})
# Извлечь __APP_DATA__ из HTML
match = re.search(r'window\.__APP_DATA__\s*=\s*(\{.+?\});?\s*</script>', 
                  resp.text, re.DOTALL)
data = json.loads(match.group(1))
site_data = data['layout']['data']
# site_data['overview']['globalRank'] → 75
# site_data['overview']['visitsTotalCount'] → 530542800
```

**Autocomplete API:**
```python
resp = requests.get('https://www.similarweb.com/api/universal',
                    params={'term': 'amazon', 'dataKeys': 'websites,apps,companies'},
                    headers={'Referer': 'https://www.similarweb.com/'})
results = resp.json()
# results['websites'][0]['name'] → 'amazon.com'
```

---

**Top-50 websites:**
```python
# Full reload по URL - никакого AJAX
GET /top-websites/                                    # Global, все категории
GET /top-websites/arts-and-entertainment/             # Фильтр по категории
GET /top-websites/arts-and-entertainment/us/          # Категория + страна
GET /top-websites/trending/                           # Трендовые

# Парсинг - всё в __APP_DATA__.layout.data.sites (массив 50 объектов)
for site in data['layout']['data']['sites']:
    domain = site['domain']
    bounce = site['bounceRate']
    duration = site['visitsAvgDurationFormatted']
    pages_per_visit = site['pagesPerVisit']
```

---

### 12. Защита от скрапинга (Anti-bot стек)

SimilarWeb имеет **наиболее агрессивную защиту** из всех пяти проанализированных сайтов:

**Уровень 1 — AWS WAF:**
```
challenge.js → собирает browser fingerprint
/inputs      → отправляет mouse/keyboard/canvas entropy signals
/telemetry   → 4× телеметрия при загрузке (поведенческий анализ)
/mp_verify   → Mathematical Proof of Work (Proof-of-Work challenge)
```
Результат сохраняется в `localStorage.awswaf_session_storage` и передаётся в куки при каждом запросе. Без валидного WAF-токена — `x-amzn-waf-action: captcha`.

**Уровень 2 — FingerprintJS v2:**
```javascript
// cdn.jsdelivr.net/npm/fingerprintjs2@2.1.4
// Собирает: canvas fingerprint, WebGL, AudioContext, fonts,
// screen resolution, timezone, plugins, user-agent, platform
Fingerprint2.get(components => {
  const fp = Fingerprint2.x64hash128(components.map(c => c.value).join(''), 31);
  // передаётся в WAF telemetry
});
```

**Уровень 3 — CloudFront Rate Limiting:**
```
x-amzn-waf-action: allow    → нормальный запрос
x-amzn-waf-action: captcha  → превышен лимит / подозрительный паттерн
x-amzn-waf-action: block    → полная блокировка
x-cache: Error from cloudfront → ответ заблокирован
```

**Уровень 4 — Paywall (`isLimited`):**
```javascript
// В __APP_DATA__.layout.isLimited = true
// Большинство детальных данных (organic %, referrals, paid keywords) → null
trafficSources[1].percentage = null  // organic - скрыто
trafficSources[2].percentage = null  // referrals - скрыто
```

---

### 13. Субдомены и вся инфраструктура

| Домен | Назначение |
|-------|-----------|
| `www.similarweb.com` | Основной сайт (SSR HTML + `/api/universal` + `/api/exception`) |
| `static-us-east-1.similarcdn.com` | Статические ресурсы JS/CSS (React, app bundles) |
| `site-images.similarcdn.com` | Favicon и превью изображений сайтов |
| `gro.similarweb.com` | i18n переводы |
| `secure.similarweb.com` | Аутентификация (login/logout) |
| `pro.similarweb.com` | PRO/платная версия |
| `account.similarweb.com` | Управление аккаунтом |
| `matomo.cloudfront.similarweb.io` | Self-hosted Matomo аналитика через CloudFront |
| `7ef1a1ef43ff.edge.sdk.awswaf.com` | AWS WAF SDK (challenge, telemetry, verify) |
| `cdn.growthbook.io` | GrowthBook A/B testing feature flags |
| `cdn.jsdelivr.net` | FingerprintJS v2 CDN |
| `accounts.google.com` | Google One Tap sign-in |
| `www.googletagmanager.com` | Google Tag Manager |
| `s3.us-east-1.amazonaws.com` | AWS S3 (статические ассеты) |

---

### 14. URL-схема сайта (полная карта)

```
www.similarweb.com/
├── /top-websites/                         # Топ-50 глобально
│   ├── /top-websites/{category}/          # Фильтр по категории (26 категорий)
│   ├── /top-websites/{category}/{country}/# Категория + страна (60 стран)
│   └── /top-websites/trending/            # Трендовые
│
├── /website/{domain}/                     # Профиль сайта (overview)
│   ├── #overview                          # ↕ hash-навигация (не AJAX)
│   ├── #ranking
│   ├── #geography
│   ├── #competitors
│   ├── #traffic-sources
│   ├── #outgoing-links
│   └── #technologies
│
├── /website/{domain}/vs/{domain2}/        # Сравнение двух сайтов
│
├── /{locale}/website/{domain}/            # Локализованные версии
│   └── /de/, /es/, /fr/, /it/, /ja/, /pt/, /tr/, /zh/, /zh-tw/, /ru/
│
└── /api/
    ├── /api/universal?term=&dataKeys=     # Autocomplete (GET, JSON)
    └── /api/exception                     # Error reporting (POST only)
```

---

### 15. Итоговое сравнение всех пяти движков

| Критерий | Google | Bing | Yahoo! | DDG | SimilarWeb |
|----------|--------|------|--------|-----|------------|
| **Рендеринг** | SSR | SSR | SSR | SSR+React | SSR+React 17 |
| **Пагинация** | Full reload `?start=N` | SPA AJAX `snrjson` | Full reload `?b=N` | Infinite Scroll `d.js` JSONP | Full reload (URL фильтр) |
| **Данные** | HTML | HTML / JSON | HTML | JSONP | `window.__APP_DATA__` |
| **CDN** | Google own | Akamai/Azure | ATS | nginx | **AWS CloudFront** |
| **Server** | `gws` | `Microsoft-IIS` | `ATS` | `nginx` | **`CloudFront`** |
| **Кодирование** | `br` | `br` | `br` | `br` | **`gzip`** |
| **Бэкенд поиска** | Google | Microsoft | Microsoft Bing | Microsoft Bing v7 | Proprietary data |
| **WAF** | reCAPTCHA | — | — | — | **AWS WAF + FingerprintJS + PoW** |
| **Anti-bot** | Слабый | Слабый | Слабый | Слабый | **Агрессивный** |
| **Autocomplete** | `/complete/search` JSON+`)]}'` | `/AS/Suggestions` HTML | `/sugg/gossip/...` JSON | `/ac/` OpenSearch JSON | **`/api/universal`** (websites+apps+companies) |
| **Ссылки** | `a[jsname="UWckNb"]` прямой href | `/ck/a?u=a1[B64]` redirect | `a[data-matarget="algo"]` прямой | `a[data-testid="result-title-a"]` прямой | **`sites[N].domain` → `/website/{domain}/`** |
| **Paywall** | Нет | Нет | Нет | Нет | **Да** |
| **A/B testing** | Internal | Internal | Internal | DDG.Data.Experiments | **GrowthBook** |
| **Analytics** | Google Analytics | Internal | Yahoo Rapid v3.69 | improving.duckduckgo.com | **Matomo self-hosted + GTM** |
| **Privacy** | Низкая | Низкая | Низкая | **Высокая** | Низкая |
| **localStorage** | — | — | — | — | **awswaf_token + gbFeaturesCache** |
