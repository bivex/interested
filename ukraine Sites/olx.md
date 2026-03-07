## Схема завантаження SPA на OLX.ua — повний розбір

### 🏗️ Архітектура: SSR + CSR Hybrid

OLX використовує **React SPA з Server-Side Rendering (SSR)**. Перша сторінка рендериться на сервері з уже вбудованими оголошеннями в HTML. При переходах між сторінками (пагінація) — дані підвантажуються через **два API-запити**:

---

### 📡 API-схема (при зміні сторінки)

**Крок 1 — Resolve friendly URL → search params:**
```
GET https://www.olx.ua/api/v1/friendly-links/query-params/q-apple-ipad/?page=2
Headers:
  X-Client: DESKTOP
  Accept-Language: uk
  X-Device-Id: <uuid>
  credentials: same-origin

Response: {"data": {"query": "apple ipad"}, "metadata": {...}}
```
Цей запит переводить ЧПУ-URL в параметри пошуку.

---

**Крок 2 — GraphQL запит за оголошеннями (ГОЛОВНИЙ):**
```
POST https://www.olx.ua/apigateway/graphql
Headers:
  Content-Type: application/json
  accept: application/json
  accept-language: uk
  x-client: DESKTOP

Body:
{
  "query": "query ListingSearchQuery(...) { clientCompatibleListings(...) }",
  "variables": {
    "searchParameters": [
      { "key": "offset", "value": "40" },   // (page-1) * 40
      { "key": "limit",  "value": "40" },
      { "key": "query",  "value": "apple ipad" },
      { "key": "sl",     "value": "19b44dcb8dcx67a876cb" }  // session-like token
    ],
    "fetchJobSummary": false,
    "fetchPayAndShip": false
  }
}
```

---

### 📊 Пагінація

| Параметр | Значення |
|---|---|
| `limit` | 40 (органічних) |
| `offset` | `(page - 1) * 40` |
| Реальних оголошень | 7 888 |
| API видає максимум | 1 000 (`total_elements`) |
| Сторінок в UI | 25 (по 40 = 1000) |
| Повернуто за запит | **52** (40 органічних + 12 promoted) |

Promoted ads вставляються на позиції: `[0,1,2,13,14,15,26,27,28,39,40,41]` — кожні 13 позицій блок з 3 реклам.

---

### 📦 Структура об'єкту оголошення (GraphQL response)

```json
{
  "id": 907925814,
  "title": "Apple ipad 5 gen. 32Gb. WIFI + 4G LTE",
  "url": "https://www.olx.ua/d/uk/obyavlenie/...",
  "description": "Продам планшет...",
  "created_time": "2025-11-29T16:47:48+02:00",
  "last_refresh_time": "2026-03-06T15:03:59+02:00",
  "business": true,
  "location": {
    "city": { "name": "Запоріжжя" },
    "region": { "name": "Запорізька область" }
  },
  "params": [
    { "key": "price", "value": {
        "value": 3400, "label": "3 400 грн.", "currency": "UAH",
        "negotiable": false, "previous_value": null
      }
    },
    { "key": "state", "value": { "label": "Вживане" } }
  ],
  "photos": [{ "link": "https://ireland.apollo.olxcdn.com/...", "width": ..., "height": ... }],
  "user": { "name": "Петро", "seller_type": "private", "verification": { "status": "verified" } },
  "promotion": { "highlighted": false, "top_ad": true, "urgent": false },
  "map": { "lat": 47.83, "lon": 35.14 }
}
```

---

### 🔑 Як збирати дані для аналізу (без `sl` токена)

Параметр `sl` **не обов'язковий** — перевірив: запит без нього повертає повноцінні дані. Достатньо тільки `credentials: same-origin` (сесійні куки).

**Схема перебору сторінок:**
```python
for page in range(0, 25):  # 25 сторінок = 1000 оголошень
    offset = page * 40
    variables = {
        "searchParameters": [
            {"key": "offset", "value": str(offset)},
            {"key": "limit",  "value": "40"},
            {"key": "query",  "value": "apple ipad"}
        ]
    }
    # POST https://www.olx.ua/apigateway/graphql
```

**Поля для аналізу:**
- `id`, `title`, `url` — ідентифікація
- `params[price].value` — ціна (UAH), `negotiable` — торг
- `params[state].label` — новий / вживаний
- `location.city.name`, `location.region.name` — географія
- `created_time`, `last_refresh_time` — дати
- `business` — приватник vs бізнес
- `promotion.top_ad`, `promotion.highlighted` — чи платне просування
- `user.seller_type`, `user.verification.status` — тип продавця
- `description` — повний опис
- `photos[].link` — фото (CDN: `ireland.apollo.olxcdn.com`)

---

### ⚠️ Важливо для скрейпінгу

1. **Потрібна авторизована сесія** (куки з браузера) — без них GraphQL може повертати помилку або капчу
2. **Promoted оголошення дублюються** між сторінками — фільтруй за індексами з `metadata.source.organic`
3. **API обмежує** до 1000 результатів (`total_elements`), хоча реальних 7888 (`visible_total_count`) — для повного збору потрібно фільтрувати по регіонах/категоріях





-----------------------------------------------------------------------------------------



## Що змінилось після авторизації

### ✅ Головна зміна: Bearer Token у всіх запитах

Тепер **кожен** API-запит автоматично відправляє JWT:

```
Authorization: Bearer eyJraWQiOiI3TzI5...
```

Це **AWS Cognito JWT**, термін дії — **15 хвилин**, після чого сайт оновлює його автоматично через refresh flow. Тобто для скрейпінгу потрібно підтримувати живу сесію або оновлювати токен.

---

### 📊 Порівняння: без авторизації vs з авторизацією

| | Без авторизації | З авторизацією |
|---|---|---|
| GraphQL заголовки | `Content-Type, accept, accept-language, x-client` | + **`Authorization: Bearer <JWT>`** |
| Отримання оголошень | ✅ Працює | ✅ Працює |
| Параметр `sl` | Потрібен (копіюється з сесії) | Потрібен (той самий) |
| Кількість результатів | 52/сторінку | 52/сторінку (однаково) |
| **Телефони продавців** | ❌ Недоступно | ✅ **Повний номер телефону** |
| Персональні рекомендації | ❌ | ✅ |

---

### 📞 Нова схема: отримання телефону продавця (3 кроки)

При кліку "показати" запускається ланцюжок:

**1. Anti-fraud challenge:**
```
POST https://friction.olxgroup.com/challenge
Body: { "action": "reveal_phone_number", "aud": "atlas", 
        "actor": { "username": "<user_uuid>" },
        "scene": { "ad_id": "916372110", ... } }
```

**2. Token exchange:**
```
POST https://friction.olxgroup.com/exchange
```

**3. Отримання номера:**
```
GET https://www.olx.ua/api/v1/offers/{offer_id}/limited-phones/
Headers: Authorization: Bearer <JWT>

Response: { "data": { "phones": ["068-111-1111"] } }
```

**4. Трекінг перегляду:**
```
POST https://www.olx.ua/api/v1/offers/{offer_id}/phone-view/
Body: {}
```

> ⚠️ **Friction challenge** — це антибот-захист OLX. Він перевіряє що дію виконує реальний авторизований користувач. Без проходження цього challenge endpoint `/limited-phones/` поверне помилку.

---

### 🔑 Що стало легше з авторизацією

1. **Номери телефонів** — тепер доступні через `/api/v1/offers/{id}/limited-phones/` (з Bearer token)
2. **GraphQL без `x-fingerprint`** — при авторизації не потрібен важкий fingerprint-хедер (він залишився тільки в REST `/friendly-links/` запиті)
3. **GraphQL без `credentials: same-origin`** — Bearer token достатньо, куки не обов'язкові для основного API
4. **`OtherSellerAdsQuery`** — можна отримати всі оголошення продавця за `sellerId`
5. **`AdRecommendationsQuery`** — рекомендовані схожі оголошення

---

### 🛠️ Практична схема збору даних (авторизований режим)

```python
headers = {
    "Authorization": f"Bearer {access_token}",  # з куки access_token
    "Content-Type": "application/json",
    "accept": "application/json",
    "accept-language": "uk",
    "x-client": "DESKTOP"
}

# Перебір сторінок (25 сторінок × 40 = 1000 оголошень)
for page in range(25):
    variables = {
        "searchParameters": [
            {"key": "offset", "value": str(page * 40)},
            {"key": "limit",  "value": "40"},
            {"key": "query",  "value": "apple ipad"}
        ]
    }
    # POST https://www.olx.ua/apigateway/graphql

# Телефон (тільки якщо потрібно + є friction token)
# GET https://www.olx.ua/api/v1/offers/{id}/limited-phones/
```

**Токен живе 15 хв** → потрібно оновлювати кожні ~14 хвилин через AWS Cognito refresh endpoint.
