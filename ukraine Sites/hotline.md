## Hotline.ua — повний розбір схеми

### 🏗️ Архітектура: Nuxt SSR + GraphQL з токен-захистом

Hotline — **Nuxt.js додаток** з повним SSR. Всі дані вбудовані в `window.__NUXT__` при завантаженні сторінки. При SPA-навігації між сторінками робляться два GraphQL-запити.

---

### 📡 API-схема (2 кроки при кожному переході)

**Крок 1 — Отримати одноразовий токен:**
```
POST //hotline.ua/svc/frontend-api/graphql

Headers: { content-type: application/json, x-language: uk, 
           x-token: <random-uuid>, x-request-id: <random-uuid> }
Credentials: include (потрібні куки)

Body:
{ operationName: "urlTypeDefiner",
  variables: { path: "/computer/planshety/" },
  query: "query urlTypeDefiner($path: String!) { urlTypeDefiner(path: $path) { token type state } }" }

Response: { token: "ab70259c-8029-...", type: "catalog" }
```

**Крок 2 — Основний запит (з токеном з кроку 1):**
```
POST //hotline.ua/svc/frontend-api/graphql
x-token: <token з кроку 1>  ← ВАЖЛИВО

# Для пошуку:
operationName: productsSearch
variables: { phrase: "apple ipad", vendorIds: "", page: 1 }

# Для каталогу:
operationName: getCatalogProducts
variables: { path: "planshety", cityId: 187, page: 2, 
             sort: "popularity", phrase: "apple ipad",
             itemsPerPage: 48, filters: [], excludedFilters: [] }
```

---

### 🔑 Система токенів

| Аспект | Деталі |
|---|---|
| `x-token` | Видає `urlTypeDefiner`, **одноразовий**, прив'язаний до сесії (кук) |
| `x-request-id` | = `window.__NUXT__.state.uniqId` (постійний ідентифікатор браузера) |
| Куки | `hluniqueid`, `hl_guest_id`, `hl_sid` — **обов'язкові** |
| Без кук | Повертає `{"errors": [{"message": "invalid-request-token"}]}` |

Схема: **urlTypeDefiner → видає token → token використовується в наступному запиті → погашається**. Тобто для кожної сторінки потрібна нова пара запитів.

---

### 📦 Структура даних

**Два режими пошуку:**

| Query | Повертає | Ліміт |
|---|---|---|
| `productsSearch` | Топ-48 моделей по всіх категоріях | **48 max**, lastPage=1 |
| `getCatalogProducts` (з phrase) | Моделі в категорії за пошуком | **48 max** (Apple iPad = 48 унікальних моделей) |
| `getCatalogProducts` (без phrase) | Всі моделі в категорії | 48/сторінку, пагінація |

**Поля продукту:**
```json
{
  "_id": 14700416,
  "title": "iPad Pro 11 2018 Wi-Fi + Cellular 1TB Silver",
  "url": "/computer-planshety/...",
  "minPrice": 32263,
  "maxPrice": 34684,
  "offerCount": 4,
  "vendor": { "title": "Apple" },
  "techShortSpecificationsList": [...],
  "singleOffer": {
    "firmTitle": "Noteboochek",
    "price": 29313,
    "delivery": { "hasFreeDelivery": false, "name": "з Києва", ... }
  }
}
```

**Повна сторінка товару (`window.__NUXT__.state.product`):**
- `offers.edges[]` — **всі пропозиції магазинів** з цінами, доставкою, гарантіями
- `fullDescription` — повний опис
- `techShortSpecificationsList` — всі характеристики
- `barcode`, `reviewsCount`, `rating`, `minPrice/maxPrice`
- `lastHistoryPrice`, `lastHistoryDate` — цінова динаміка

---

### 🗺️ Де що живе

| Дані | Джерело |
|---|---|
| Топ-48 моделей по запиту | `productsSearch` (SPA) або `window.__NUXT__.state.sr.productsSearch` (SSR) |
| Повний каталог категорії | `getCatalogProducts` (SPA) або `window.__NUXT__.state.catalog.products` (SSR) |
| Всі пропозиції магазинів | `window.__NUXT__.state.product.offers.edges[]` (SSR) |
| Повний опис і характеристики | `window.__NUXT__.state.product` (SSR) |

---

### ⚠️ Складнощі vs OLX/Prom

| | OLX | Prom | **Hotline** |
|---|---|---|---|
| Auth | Куки/JWT | ❌ Не треба | ✅ Куки обов'язкові |
| Token | JWT (15 хв) | ❌ Немає | Одноразовий UUID |
| Схема | 2-крок | 1-крок | **2-крок (get token → use token)** |
| SSR дані | Немає | Apollo cache | `window.__NUXT__` |
| Ліміт товарів | 1000 | 7471+ | **48/запит** (але SSR дає більше) |

**Hotline найскладніший** — токен одноразовий і потребує валідних кук сесії. Найефективніший підхід: парсити безпосередньо `window.__NUXT__` з SSR-відповіді через звичайний HTTP GET запит сторінки (без JS), там є весь потрібний стейт.
