---

## Yahoo! Search — Полный технический анализ

---

### 1. Инфраструктура и рендеринг

| Параметр | Значение |
|----------|----------|
| **Рендеринг** | SSR (Server-Side Rendering) — полный HTML приходит с сервера |
| **Тип навигации** | MPA (Multi-Page Application) — full reload при пагинации |
| **Протокол** | HTTP/2 (`nextHopProtocol: h2`) |
| **CDN/сервер** | ATS (Apache Traffic Server) — Yahoo собственный CDN |
| **Прокси** | Envoy (`x-envoy-decorator-operation`) — k8s в дата-центре bf1 |
| **Поисковой бэкенд** | Microsoft Bing (`c.bing.com/c.gif`, "Powered by Bing™" в футере) |
| **transferSize** | ~56 KB (сжатый Brotli) |
| **decodedBodySize** | ~221 KB (raw HTML) |
| **domInteractive** | ~1428 ms |

---

### 2. Заголовки запроса (браузер → Yahoo)

Браузер отправляет стандартный набор + Client Hints (запрошенные через `accept-ch`):

```
GET /search?p=apple+ipad HTTP/2
Host: search.yahoo.com
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Sec-CH-UA: "Chromium";v="..."
Sec-CH-UA-Mobile: ?0
Sec-CH-UA-Platform: "macOS"
Sec-CH-UA-Full-Version-List: ...
Sec-CH-UA-Arch: ...
Sec-CH-UA-Bitness: ...
Cookie: [session cookies, B=..., GUC=...]
```

---

### 3. Заголовки ответа (Yahoo → браузер)

HTTP 200, все 17 заголовков:

| Заголовок | Значение |
|-----------|----------|
| `server` | `ATS` |
| `cache-control` | `private` |
| `age` | `0` |
| `content-encoding` | `br` (Brotli) |
| `content-type` | `text/html; charset=UTF-8` |
| `vary` | `Accept-Encoding` |
| `x-frame-options` | `DENY` |
| `x-content-type-options` | `nosniff` |
| `x-xss-protection` | `1; mode=block` |
| `referrer-policy` | `no-referrer-when-downgrade` |
| `strict-transport-security` | `max-age=31536000` |
| `secure_search_bypass` | `true` |
| `x-envoy-upstream-service-time` | `55` (мс до upstream) |
| `x-envoy-decorator-operation` | `sfe-k8s--syc-production-bf1.search--web-syc-k8s:4080/*` |
| `content-security-policy` | `[обширная политика]` |
| `accept-ch` | `Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform, Sec-CH-UA-Bitness, Sec-CH-UA-Arch, Sec-CH-UA-Full-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model, Sec-CH-UA-Platform-Version` |
| `p3p` | `policyref=...` (устаревший стандарт, Yahoo до сих пор его шлёт) |

---

### 4. Механизм пагинации

**Тип: Full Reload (MPA)** — никаких AJAX-запросов при переходе между страницами.

**URL структура:**

```
https://search.yahoo.com/search
  ;_ylt=AwrNYvFRlaxpHP0VOwVDDWVH    ← матрица трекинга (Base64)
  ;_ylc=X1MDMTE5...                  ← конфиг сессии (Base64)
  ?p=apple+ipad                      ← поисковый запрос
  &b=8                               ← смещение (номер первого результата)
  &pz=7                              ← размер страницы (7 organic результатов)
  &bct=0                             ← тип поиска
  &xargs=0                           ← extra args
  &fr=sfp                            ← frame/источник (search form page)
  &fr2=p:s,v:sfp,m:sb-top           ← вторичный frame (search bar top)
```

**Паттерн инкремента `b`:**

| Страница | `b=` | Смещение |
|----------|------|----------|
| 1 | 1 (default) | результаты 1–7 |
| 2 | 8 | результаты 8–14 |
| 3 | 15 | результаты 15–21 |
| 4 | 22 | результаты 22–28 |
| 5 | 29 | результаты 29–35 |

Шаг = 7 (совпадает с `pz=7`).

**`_ylt` / `_ylu` декодирование (Base64):**

`_ylu=Y29sbwNiZjEEcG9zAzEEdnRpZAMEc2VjA3BhZ2luYXRpb24-` → `colo=bf1 | pos=1 | vtid= | sec=pagination`

Это трекинг-токены для позиции элемента в сетке и дата-центра (`bf1` = Burbank, CA). Никаких данных для извлечения ссылок — только аналитика.

---

### 5. Где живут ссылки результатов

**DOM-селектор:**

```css
#web ol li a[data-matarget="algo"]
```

**Атрибуты ссылки:**

```html
<a
  href="https://www.apple.com/ipad/"          ← ПРЯМОЙ URL (без обёртки!)
  data-matarget="algo"                        ← маркер органического результата
  data-b20="64c75af849a758"                   ← 14-символьный hex-токен клика
  target="_blank"
  referrerpolicy="origin"
  class="d-ib va-top mt-38 mb-4 mxw-100"
>
```

**Ключевые факты:**
- `href` содержит **прямой URL** сайта — никаких редиректов, никакого Base64 (в отличие от Bing's `/ck/a?u=a1...`)
- `data-b20` — hex-токен для корреляции клика на беконе `/beacon/sbac`
- `referrerpolicy="origin"` — Yahoo передаёт только origin в Referer при клике
- `target="_blank"` — открывается в новой вкладке

---

### 6. JavaScript-глобалы

```javascript
window.YAHOO = {
  ULT: {           // User/Link Tracking — содержит encode64(), track_click(), BEACON: "https://geo.yahoo.com/t"
    BEACON: "https://geo.yahoo.com/t"
  },
  SBClass: {},     // Search Bar Class
  NBClass: {},     // Navigation Bar Class  
  AjaxHelper: {},  // AJAX утилиты
  AssetManager: {}, // управление ресурсами
  BingLoadBeacon: {}, // интеграция Bing (!)
  AlgoRsItem: {},  // Algorithmic Result Item
  i13n: {          // Instrumentation / аналитика
    Rapid: {},     // Yahoo Rapid framework
    __RAPID_INFO__: { version: "3.69.0", comboName: "ANALYTICS-VERSIONED-PROD" }
  },
  ABPDetected: ... // Ad-block detection
}

window.rapidInstance  // Yahoo Rapid analytics instance
// методы: beaconClick(), beaconEvent(), trackModule(), addModuleAPV()
```

---

### 7. Асинхронные эндпоинты

#### 7.1 Автодополнение

```
GET /sugg/gossip/gossip-us-ura/?output=sd1&command=apple+ipad&nresults=10
Host: search.yahoo.com
```

**Response (HTTP 200):**
```json
{
  "q": "apple ipad",
  "l": { "gprid": "FF..." },
  "r": [
    { "k": "apple ipad",        "m": 6 },
    { "k": "apple ipad pro",    "m": 0 },
    { "k": "apple ipad mini",   "m": 0 },
    { "k": "apple ipad (a16)",  "m": 0 },
    { "k": "apple ipad air",    "m": 0 }
  ]
}
```

- `k` = keyword (текст подсказки)
- `m` = match type (`6` = точное совпадение с запросом, `0` = предложение)
- `content-length: 209` (маленький, нет лишних данных)
- `server: ATS`, `cache-control: private`, `expires: [datetime]`
- Чистый JSON (без XSSI-защиты типа `)]}'\n` — в отличие от Google)

#### 7.2 Телеметрия страницы

```
POST https://geo.yahoo.com/p
Content-Type: application/octet-stream

[бинарный payload с ETX \x03 / EOT \x04 разделителями]
A_cmi=...ETX A_utm=...ETX A_pfb=...ETX _bt=rapid EOT
```

- `_bt=rapid` → фреймворк Yahoo Rapid
- Метрики производительности: Core Web Vitals, FCP, LCP
- Endpoint возвращал 503 при прямом вызове (rate-limit по origin)
- Тип в PerformanceEntry: `beacon` (используется `navigator.sendBeacon()`)

#### 7.3 Click Impression Beacon (sbai)

```
GET /beacon/sbai/bf/5?IG=...&CID=...&Type=Event.CPT&DATA=...&[timestamp]=
```

- `sbai` = Search Bing Ad Impression (или "search beacon after impression")
- `/bf/5` → дата-центр `bf` (Burbank), сервер `5`
- `Type=Event.CPT` → событие Content Performance Tracking
- Отправляется через `<img>` тег (1×1 пиксель)
- `IG` + `CID` — Bing Impression GUID + Client ID (Bing-бэкенд данные!)

#### 7.4 Pre-click Beacon (sbac)

```
GET /beacon/sbac/bf/1?IG=...&CID=...&ID=Yahoo,305.1&t=[timestamp]
```

- `sbac` = Search Bing Ad Click — срабатывает перед уходом пользователя
- Посылается при `mousedown` на результат (до фактического клика)
- `ID=Yahoo,305.1` — идентификатор места клика в Yahoo SRP

---

### 8. Сравнительная таблица: Google vs Bing vs Yahoo

| Критерий | Google | Microsoft Bing | Yahoo! |
|----------|--------|----------------|--------|
| **Рендеринг** | SSR HTML | SSR HTML | SSR HTML |
| **Пагинация** | Full reload | **SPA/AJAX** (`format=snrjson`) | Full reload |
| **Пагинация параметр** | `?start=N` (N=10,20…) | `?first=N&FORM=PERE` | `?b=N&pz=7` (N=8,15,22…) |
| **Протокол** | HTTP/2 | HTTP/2 | HTTP/2 |
| **Server header** | `gws` (Google Web Server) | `Microsoft-IIS/10.0` | `ATS` (Apache Traffic Server) |
| **Прокси** | — | — | Envoy (`x-envoy-decorator-operation`) |
| **CDN** | Google own | Akamai/Azure | ATS + Yahoo CDN |
| **Кодирование контента** | `br` (Brotli) | `br` (Brotli) | `br` (Brotli) |
| **Ссылки результатов** | `a[jsname="UWckNb"]` | `a.b_algo h2 a` | `a[data-matarget="algo"]` |
| **Формат href** | **Прямой** `https://...` | **Обёртка** `/ck/a?u=a1[Base64]` | **Прямой** `https://...` |
| **Трекинг клика** | `ping="/url?..."` attr | `/ck/a` redirect | `data-b20` hex-токен + `/beacon/sbac` |
| **Автодополнение** | `/complete/search` → JSON с `)]}'` | `/AS/Suggestions` → **HTML** | `/sugg/gossip/gossip-us-ura/` → чистый **JSON** |
| **Телеметрия** | `/log` (GET, urlencoded) | `/web/xlsc.aspx` (бинарный/зашифрованный) | `geo.yahoo.com/p` (POST, ETX/EOT бинарный) |
| **JS глобал** | `google.*`, `rwt()` | `window._G` (IG, SID, cigi...) | `window.YAHOO.*`, `window.rapidInstance` |
| **Аналитика** | Internal | Internal | **Yahoo Rapid v3.69.0** |
| **Поисковой бэкенд** | Google | Microsoft | **Microsoft Bing** (!) |
| **XSSI защита** | Да — `)]}'` в автодополнении | — | Нет |
| **cache-control** | `private` | `private` | `private` |
| **X-Frame-Options** | `SAMEORIGIN` | — | `DENY` |
| **CSP** | Да | Да | Да |

---

### 9. Как получить ссылки программно (рецепт)

**Google:**
```python
# HTML парсинг:
links = soup.select('a[jsname="UWckNb"]')
for link in links:
    url = link['href']  # уже https://... прямой
```

**Bing:**
```python
# HTML парсинг:
import base64, urllib.parse
links = soup.select('.b_algo h2 a')
for link in links:
    href = link['href']
    if '/ck/a' in href:
        u_param = urllib.parse.parse_qs(urllib.parse.urlparse(href).query).get('u',[''])[0]
        real_url = base64.b64decode(u_param[2:] + '==').decode('utf-8', errors='ignore')
```

**Yahoo:**
```python
# HTML парсинг:
links = soup.select('a[data-matarget="algo"]')
for link in links:
    url = link['href']  # уже https://... прямой, как у Google
```

---

**Итог Yahoo:** Yahoo — это по сути Google-интерфейс поверх Bing-бэкенда. Пагинация полностраничная (MPA), ссылки прямые без обёртки, аналитика через Yahoo Rapid framework, инфраструктура — ATS + Envoy на Kubernetes в дата-центре `bf1` (Burbank, CA). Наличие `IG`/`CID` в beacon запросах и `c.bing.com` пинга однозначно подтверждает Bing как поисковой движок.
