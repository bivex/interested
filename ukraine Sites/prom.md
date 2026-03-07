## Prom.ua — повний розбір схеми (без авторизації)

### 🏗️ Архітектура: SSR + Apollo GraphQL

Prom — це **повністю SSR**-додаток (рендеринг на сервері). Сторінка приходить з уже вбудованими товарами в HTML. Але **попри SSR**, GraphQL API доступний напряму і не потребує жодної авторизації.

---

### 🔑 Головне відкриття: GraphQL API без авторизації

**Endpoint:**
```
POST https://prom.ua/graphql
```

**Мінімальні заголовки:**
```
Content-Type: application/json
```

Більше нічого не потрібно! Ні токена, ні кук, ні `x-requested-with`. Перевірив — працює.

---

### 📦 Схема отримання товарів

**GraphQL запит `searchListing`:**
```graphql
query Search($search_term: String, $params: ListingParams, $limit: Int, $offset: Int) {
  searchListing(search_term: $search_term, params: $params, limit: $limit, offset: $offset) {
    page {
      total
      products {
        product {
          id
          name
          price
          priceCurrency
          priceUSD
          priceOriginal
          discountedPrice
          hasDiscount
          urlText          # -> https://prom.ua/ua/{urlText}
          sku
          categoryId
          company_id
          signed_id
          priceFrom
          canShowPrice
          company { id name }
          presence { isAvailable isOrderable }
        }
      }
    }
  }
}
```

**Змінні:**
```json
{
  "search_term": "apple ipad",
  "params": { "page": "2", "binary_filters": [] },
  "limit": 29,
  "offset": 29
}
```

**Результат першого товару:**
```json
{
  "id": 2667699702,
  "name": "Apple iPad 7 (2019) 10.2\" 128 ГБ Wi-Fi Space Gray",
  "price": "6690",
  "priceCurrency": "UAH",
  "priceUSD": "152.99",
  "hasDiscount": false,
  "discountedPrice": "6690",
  "company": { "name": "Matrix Store" },
  "presence": { "isAvailable": true }
}
```

---

### 📊 Параметри пагінації

| Параметр | Значення |
|---|---|
| Всього товарів | **7 471** |
| Максимум за запит | **29** (жорсткий ліміт Prom, limit=100 ігнорується) |
| Пагінація | `params.page` + `offset` = `(page-1)*29` |
| Кількість сторінок | ~258 |
| Обмеження глибини | ✅ Жодних — сторінка 100 повертає дані |

---

### 📄 Де що живе

| Дані | Джерело |
|---|---|
| Список товарів (id, ціна, назва, продавець) | `POST /graphql` → `searchListing` — **без авторизації** |
| Окремий товар за ID | `POST /graphql` → `product(id: $id)` — **без авторизації** |
| Опис товару | SSR HTML або JSON-LD `<script type="application/ld+json">` |
| Фото товарів | JSON-LD в HTML (CDN `images.prom.ua`) |
| Promo-банери | `/graphql` → `PromoLabelsQuery` (lazy, при скролі) |
| Стан Apollo кешу | `window.ApolloCacheState['_FAST_CACHE']` (доступно в браузері) |

---

### 🆚 Порівняння з OLX

| | OLX | Prom |
|---|---|---|
| Auth для списку | ❌ Потрібні куки/session | ✅ **Без авторизації** |
| Протокол | GraphQL (apigateway) | GraphQL (/graphql) |
| Ліміт/сторінку | 40 орган. + 12 promoted | 29 |
| Макс. товарів | 1 000 (API cap) | 7 471 (без обмежень) |
| Телефони | Окремий захищений API | Не потрібні (магазини) |
| SSR дані | Немає в window | `window.ApolloCacheState` |

---

### 🛠️ Готова схема скрейпінгу Prom (Python)

```python
import requests

BASE_URL = "https://prom.ua/graphql"
HEADERS = {"Content-Type": "application/json"}

QUERY = """
query Search($search_term: String, $params: ListingParams, $limit: Int, $offset: Int) {
  searchListing(search_term: $search_term, params: $params, limit: $limit, offset: $offset) {
    page {
      total
      products {
        product {
          id name price priceCurrency priceUSD hasDiscount discountedPrice
          urlText sku categoryId company_id signed_id
          company { id name }
          presence { isAvailable isOrderable }
        }
      }
    }
  }
}"""

def get_page(page_num):
    offset = (page_num - 1) * 29
    resp = requests.post(BASE_URL, headers=HEADERS, json={
        "variables": {
            "search_term": "apple ipad",
            "params": {"page": str(page_num), "binary_filters": []},
            "limit": 29,
            "offset": offset
        },
        "query": QUERY
    })
    data = resp.json()["data"]["searchListing"]["page"]
    return data["total"], [p["product"] for p in data["products"]]

# Перебір всіх сторінок
total, _ = get_page(1)
pages = (total + 28) // 29  # ~258 сторінок
```

**Prom значно простіший за OLX** — жодної авторизації, жодних токенів, повний доступ до всіх сторінок без обмежень.
