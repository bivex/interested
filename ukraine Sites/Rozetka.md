## Rozetka.ua — повний розбір схеми

### 🏗️ Архітектура: Angular SSR + REST API (без авторизації)

Rozetka — **Angular Universal SSR** додаток. При першому завантаженні весь стан вбудований у `<script id="rz-client-state">`. При SPA-навігації — 3 паралельних REST GET запити. **Жодної авторизації не потрібно** — всі API відкриті.

---

### 📡 Повна схема (3 API при кожній сторінці)

**Крок 1 — Список ID товарів:**
```
GET https://catalog-api.rozetka.com.ua/v0.1/api/category/catalog
    ?country=UA&lang=ua
    &id=130309             ← ID категорії (Планшети)
    &filters=page:1;producer:apple   ← фільтри через крапку з комою

Response: {
  data: {
    goods: {
      ids: [489490789, 489491039, ...],   ← 60 ID на сторінку
      ids_count: 317,      ← всього Apple iPad на Rozetka
      shown_page: 1,
      total_pages: 6,
      goods_limit: 60,
      goods_in_category: 29821   ← всього планшетів
    },
    filters: { ... },
    sort: { ... }
  }
}
```

**Крок 2 — Деталі товарів (по IDs):**
```
GET https://common-api.rozetka.com.ua/v1/api/product/details
    ?country=UA&lang=ua
    &ids=489490789,489491039,...   ← до 60 ID через кому

Response: {
  data: {
    "489490789": {
      id, title, brand, price, old_price, discount,
      href, sell_status, status, state, dispatch,
      comments_amount, comments_mark,
      category_id, merchant_id,
      images: [...],
      group: { title, href },
      seller: { id, title, rank },
      labels, tags, premium
    }
  }
}
```

**Крок 3 — Актуальні ціни (окремо):**
```
GET https://common-api.rozetka.com.ua/v2/goods/get-price/
    ?country=UA&lng=ua&with_show_in_site=1
    &ids=489490789,...

Response: [
  { id, price, old_price, sell_status, 
    usd_price, old_usd_price,
    pl_charge_pcs, min_month_price,
    show_in_site, wholesale }
]
```

---

### 📊 Параметри пагінації та фільтрів

| Параметр | Значення |
|---|---|
| Всього Apple iPad | **317** |
| Товарів на сторінку | **60** |
| Сторінок | **6** |
| Параметр сторінки | `filters=page:2;producer:apple` |
| Обмеження глибини | ✅ Жодних |
| Auth | ❌ **Не потрібна** |

**Формат фільтрів** у `filters=`: `page:N;producer:brand;price_min:X;price_max:Y;...` — через `;`.

---

### 🗺️ SSR дані в `rz-client-state`

При GET-запиті сторінки браузер отримує `<script id="rz-client-state" type="application/json">`, де ключ — закодований API URL, значення — `{body: "...JSON..."}`. Декодування ключа: `$dt$`→`.`, `$sh$`→`/`, `$qr$`→`?`, `$ad$`→`&`.

Також є **JSON-LD** `ItemList` з 60 товарами на сторінку з полями: `name`, `url`, `image`, `price`, `availability`.

---

### 🆚 Підсумкове порівняння всіх чотирьох сайтів

| | **OLX** | **Prom** | **Hotline** | **Rozetka** |
|---|---|---|---|---|
| Auth | JWT (куки) | ❌ Не треба | Сесійні куки + one-time token | ❌ **Не треба** |
| Протокол | GraphQL | GraphQL | GraphQL | REST |
| Товарів/запит | 40+12 | 29 | 48 | **60** |
| Всього товарів | ~1000 (cap) | 7 471+ | 539 (iPads) | **317** (точно) |
| SSR дані | Немає | Apollo cache | `__NUXT__` | `rz-client-state` |
| Складність | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

---

### 🛠️ Найпростіша схема збору (Python, без auth)

```python
import requests

def get_all_apple_ipads():
    all_products = {}
    
    # Крок 1: визначити кількість сторінок
    resp = requests.get(
        "https://catalog-api.rozetka.com.ua/v0.1/api/category/catalog",
        params={"country": "UA", "lang": "ua", "id": "130309", "filters": "page:1;producer:apple"}
    ).json()
    total_pages = resp["data"]["goods"]["total_pages"]  # 6
    total = resp["data"]["goods"]["ids_count"]          # 317
    
    # Крок 2: по всіх сторінках
    for page in range(1, total_pages + 1):
        r = requests.get(..., params={"filters": f"page:{page};producer:apple"}).json()
        ids = r["data"]["goods"]["ids"]
        
        # Крок 3: деталі товарів
        details = requests.get(
            "https://common-api.rozetka.com.ua/v1/api/product/details",
            params={"country": "UA", "lang": "ua", "ids": ",".join(map(str, ids))}
        ).json()
        all_products.update(details["data"])
    
    return all_products  # 317 товарів з повними даними
```
