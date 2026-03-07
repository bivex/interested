Полный разбор по той же методологии — что браузер **шлёт** Bing и что Bing **отдаёт**. С ключевым отличием от Google — Bing использует **настоящий SPA с AJAX-пагинацией**.

---

## Главное отличие от Google — SPA-навигация

При клике на страницу 2, вместо полного reload, Bing делает **AJAX-запрос**, а URL обновляется через History API:

```
URL стал: /search?q=apple+ipad&FPIG=861F...&first=5&FORM=PERE
Тип навигации: navigate (первая загрузка SSR), потом — AJAX
```

---

## 1. Главный запрос — `GET /search` (первая загрузка)

### → БРАУЗЕР ШЛЁТ (Request Headers)

```http
GET /search?q=apple+ipad HTTP/2
Host: www.bing.com

User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
            AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36

Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7
Accept-Encoding: gzip, defe, br, zstd

# Sec-Fetch:
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document

# Client Hints (запрошенные через Accept-CH):
Sec-CH-UA: "Not:A-Brand";v="99", "Google Chrome";v="145"
Sec-CH-UA-Mobile: ?0
Sec-CH-UA-Pform: "macOS"
Sec-CH-UA-Pform-Version: "26.3.0"
Sec-CH-UA-Arch: "arm"
Sec-CH-UA-Bitness: "64"
Sec-CH-UA-Full-Version: "145.0.7632.160"
Sec-CH-UA-Full-Version-List: "Not:A-Brand";v="99.0.0.0", "Google Chrome";v="145.0.7632.160"

Cookie: <session cookies>
```

**URL Parameters:**

| Параметр | Значение | Описание |
|---|---|---|
| `q` | `apple+ipad` | Поисковый запрос |
| `first` | `5`, `15`, `25`… | **Смещение** (пагинация, шаг = 10 результатов) |
| `FORM` | `PERE`, `PERE1`, `PORE` | Источник перехода (Page 2, Page 3, Next) |
| `FPIG` | `861F7496FE8B...` | First Page IG — IG первой страницы сессии |
| `IG` | `861F7496FE8B...` | Impression GUID (новый для каждой страницы) |

### ← BING ОТДАЁТ (Response Headers)

```http
HTTP/2 200 OK
content-encoding: br                  ← Brotli (~140KB → ~536KB)
cache-control: private, max-age=0
vary: User-Agent, Accept-Encoding     ← персонализированный ответ

# Bing-специфичные:
x-display-context: full              ← тип отображения (full/partial)
x-eventid: <hex event ID>            ← ID события (как ei у Google)
x-cdn-traceid: 0.85ce2e17.177...     ← трассировка через CDN
p3p: CP="NON UNI COM NAV STA LOC..."  ← политика конфиденциальности P3P

# Безопасность:
strict-transport-security: max-age=31536000
permissions-policy: unload=()
content-security-policy: ...
cross-origin-opener-policy-report-only: ...
cross-origin-embedder-policy-report-only: ...

# Запрашивает Client Hints:
accept-ch: Sec-CH-UA-Bitness, Sec-CH-UA-Arch, Sec-CH-UA-Full-Version,
           Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Pform-Version,
           Sec-CH-UA-Full-Version-List, Sec-CH-UA-Platform, Sec-CH-UA,
           ECT, UA-Bitness, UA-Arch, UA-Full-Version, UA-Mobile,
           UA-Model, UA-Pform-Version, UA-Pform, UA

# Репортинг:
nel: {...}
report-to: {...}
useragentreductionoptout: <base64>     ← Bing хочет полный UA, не сокращённый
```

---

## 2. SPA-пагинация — `GET /search?...&format=snrjson` (КЛЮЧЕВОЙ!)

Это главное отличие от Google. При клике на страницу 2 Bing **не делает полный reload**, а шлёт AJAX:

### → БРАУЗЕР ШЛЁТ

```http
GET /search?q=apple+ipad
  &FPIG=861F7496FE8B404CA71E7093D9DEFA94  ← IG первой страницы
  &first=5                                 ← смещение
  &FORM=PERE                               ← Page result navigation
  &ajaxnorecss=1                           ← не пересылать CSS
  &sid=3765325078336B8404EF254579546A8E    ← Session ID текущей страницы
  &format=snrjson                          ← ← ← КЛЮЧЕВОЙ ПАРАМЕТР (SPA режим)
  &jsoncbid=0                              ← callback ID
  &ajaxsydconv=1                           ← Sydney conversion flag
```

### ← BING ОТДАЁТ

Не JSON и не HTML страницу, а **JavaScript-вызов**:

```javascript
<script nonce="WNwcOkav2w3h6xvklL487bSst2ZOtiRndE2sBnU2/Dg=">
window.parent.AjaxCB[0]({
  "Script": [{"Content": "...", "Method": "..."}],
  "Content": "<html фрагмент результатов>",
  "Title":   "apple ipad - Поиск"
})
</script>
```

Bing инжектирует HTML-фрагмент с результатами страницы 2 прямо в DOM, без перезагрузки. **Это настоящая SPA-архитектура.**

---

## 3. Click-трекинг — `POST /fd/ls/GLinkPingPost.aspx`

При клике на результат (до его перехода):

```http
POST /fd/ls/GLinkPingPost.aspx?IG=861F...&ID=SERP,5832.1
  &url=%2Fsearch%3Fq%3Dapple+ipad%26first%3D5...
```

Аналог `ping=` у Google, но через POST.

---

## 4. Телеметрия — `POST /web/xlsc.aspx`

```http
POST /web/xlsc.aspx?dl=1&f=8
Content-type: text/xml

# Тело: зашифрованный/сжатый бинарный поток
1dhtc5MwHADwzyKvsSThIYTjesejVueu...  ← encrypted binary telemetry
```

Аналог `/log` у Google, но **зашифрованный** (не читаемый JSON). Bing обфусцирует телеметрию.

---

## 5. Автодополнение — `GET /AS/Suggestions`

### → БРАУЗЕР ШЛЁТ

```http
GET /AS/Suggestions?pt=page.serp
  &mkt=ru-RU
  &qry=apple+ipad
  &cp=10              ← cursor position
  &cvid=<EventID>
  &ig=<IG>
  &csr=0
  &pq=apple+ipad
  &showquery=1
```

### ← BING ОТДАЁТ

```http
content-type: text/html   ← HTML, не JSON (отличие от Google!)
x-as-setsessionmarket: ...
cache-control: ...

<ul class="...">
  <li>apple ipad pro</li>
  <li>apple ipad air</li>
  ...
</ul>
```

**Bing отдаёт готовый HTML-фрагмент**, не JSON — вставляет его в дропдаун напрямую.

---

## 6. Прочие async-запросы

| Endpoint | Метод | Назначение |
|---|---|---|
| `/geolocation/write?=19.7&lon=16.1&...` | GET | Определяет гео по IP, сохраняет |
| `/rewardsapp/reportActivity?IG=...&q=apple+ipad` | POST | Начисление Bing Rewards баллов за поиск |
| `/rewardsapp/ncheader?ver=...` | POST | Загрузка шапки виджета Rewards |
| `/asyncBOPMRS?q=apple+ipad` | GET | "Best Of Page" рекомендации (отдаёт `{"success":false}`) |
| `/images/sbi?mmasync=1` | GET | Search by Image кнопка (возвращает HTML) |

---

## Где живут ссылки сайтов в Bing

В отличие от Google с прямыми `href=https://...`, Bing **оборачивает** всё через `/ck/a` с параметром `u` (Base64):

```html
<!-- В DOM: -->
<h2><a href="https://www.bing.com/ck/a?!=&p=c79d8cb40c041e4e&ptn=3&ver=2
              &hsh=4&fclid=3ed21109&u=a1aHR0cHM6Ly93d3cuZ3NtYXJlbmEu&ntb=1"
       target="_blank" h="ID=SERP,5141.2">
  Apple iPad (2025) - Full tablet specifications
</a></h2>
```

**`u=a1` + Base64** → реальный URL:

```javascript
// Декодирование:
atob("aHR0cHM6Ly93d3cuZ3NtYXJlbmEu" + "==")
// → "https://www.gsmarena.com/apple_ipad_(2025)-13702.php"
```

Формат: `a1` (префикс) + `Base64(реальный URL)`. Так Bing логирует все клики через `/ck/a` редирект.

---

## Итоговое сравнение Google vs Bing

```
                    GOOGLE                    BING
─────────────────────────────────────────────────────────────
Пагинация          Полный reload             SPA AJAX (snrjson)
URL пагинации      ?start=10,20...           ?first=5,15,25...
Ссылки в HTML      href="https://site.com"   href="/ck/a?u=a1[base64]"
Трекинг кликов     ping="/url?sa=t..."       /fd/ls/GLinkPingPost.aspx
Автодополнение     JSON (с )]}' защитой)     HTML-фрагмент
Телеметрия         JSON /log                 Encrypted binary /xlsc.aspx
Фреймворк          Closure + JSAction        Bing SPA (window._G, AjaxCB)
Глобальный объект  window.google.kEI         window._G.IG, EventID
Server             gws                       (Akamai CDN)
```
