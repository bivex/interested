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
