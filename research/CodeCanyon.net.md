На основе анализа сайта **CodeCanyon.net**, вот схема получения данных по категориям и продуктам с фильтрами:

## 📋 API СХЕМА CODECANYON

### 1. **Структура URL параметров**

```
BASE URL: https://codecanyon.net/

CATEGORY PATH:
/category/{CATEGORY_NAME}[/{SUBCATEGORY}]
Примеры:
- /category/php-scripts
- /category/php-scripts/add-ons
- /category/wordpress
- /category/javascript
```

### 2. **Параметры фильтрации (Query Parameters)**

```
URL: /category/php-scripts/add-ons?{PARAMETERS}

ОСНОВНЫЕ ПАРАМЕТРЫ:
├── sort={VALUE}
│   ├── sales           (Best sellers / По продажам)
│   ├── date            (Newest / Новейшие)
│   ├── rating          (By rating)
│   └── trending        (Trending)
│
├── price_min={VALUE}   (Минимальная цена, в USD)
├── price_max={VALUE}   (Максимальная цена, в USD)
│
├── price_category={VALUE}
│   ├── all             (Все цены)
│   ├── free            (Бесплатные)
│   ├── under_50        (До $50)
│   └── above_100       (От $100+)
│
├── date={VALUE}        (Фильтр по дате добавления)
│   ├── this-week       (На этой неделе)
│   ├── this-month      (В этом месяце)
│   ├── this-year       (В этом году)
│   └── any-date        (Любая дата)
│
├── rating={VALUE}      (Минимальный рейтинг)
│   ├── 4-plus          (4+ звезды)
│   ├── 3-plus          (3+ звезды)
│   └── 1-plus          (1+ звезды)
│
├── on_sale={VALUE}     (На распродаже)
│   └── true
│
└── search={QUERY}      (Текстовый поиск)
```

### 3. **Примеры URL запросов**

```
# По категориям и цене
https://codecanyon.net/category/php-scripts/add-ons?price_min=10&price_max=50&sort=sales

# По дате и рейтингу
https://codecanyon.net/category/wordpress?date=this-month&sort=date&rating=4-plus

# Комбинированный запрос
https://codecanyon.net/category/javascript?sort=sales&price_max=100&date=this-year&rating=3-plus

# Свободный поиск
https://codecanyon.net/search?term=chat&category=wordpress&sort=sales
```

### 4. **Структура ответа (Product List)**

```json
{
  "metadata": {
    "total_results": 881,
    "results_per_page": 20,
    "current_page": 1,
    "category": "php-scripts/add-ons"
  },
  
  "products": [
    {
      "id": "62372694",
      "title": "Restaurant App Cash Register Web Add-on",
      "slug": "restaurant-app-cash-register-web-addon",
      "author": {
        "username": "acnoo",
        "profile_url": "/user/acnoo"
      },
      "subcategory": "Add Ons",
      "price": {
        "current": 29,
        "original": 59,
        "currency": "USD",
        "discount_percent": 50
      },
      "ratings": {
        "average": 5.0,
        "count": 39,
        "display": "Rated 5.0 out of 5"
      },
      "sales": 305,
      "updated_date": "2026-03-14",
      "preview_url": "https://codecanyon.net/item/restaurant-app-cash-register-web-addon/full_screen_preview/62372694",
      "cart_url": "/cart/configure_before_adding/62372694",
      "image": {
        "url": "https://market-resized.envatousercontent.com/previews/...",
        "width": 590,
        "height": 300
      },
      "tags": ["PHP", "JavaScript", "HTML", "CSS"],
      "is_new": false,
      "is_on_sale": true
    }
  ],
  
  "filters": {
    "categories": [
      {
        "name": "All categories",
        "count": 28522,
        "slug": "/"
      },
      {
        "name": "PHP Scripts",
        "count": 2693,
        "slug": "/php-scripts"
      }
    ],
    
    "price_ranges": [
      { "label": "$6-$499", "min": 6, "max": 499 }
    ],
    
    "ratings": [
      { "label": "1 star and higher", "value": "1-plus", "count": 272 },
      { "label": "2 stars and higher", "value": "2-plus", "count": 269 },
      { "label": "3 stars and higher", "value": "3-plus", "count": 259 },
      { "label": "4 stars and higher", "value": "4-plus", "count": 232 }
    ],
    
    "dates": [
      { "label": "Any date", "value": "any-date", "count": 881 },
      { "label": "In the last year", "value": "in-the-last-year", "count": 223 },
      { "label": "In the last month", "value": "in-the-last-month", "count": 20 },
      { "label": "In the last week", "value": "in-the-last-week", "count": 7 }
    ]
  }
}
```

### 5. **Методы отправки запросов**

```javascript
// СПОСОБ 1: URL Query Parameters (основной метод)
GET /category/php-scripts/add-ons?sort=sales&price_min=10&price_max=50

// СПОСОБ 2: Direct Navigation (без AJAX)
- Клиент переходит по URL с параметрами
- Сервер возвращает полную HTML страницу
- SSR (Server-Side Rendering)

// СПОСОБ 3: AJAX/Fetch (для динамической загрузки)
// Вероятно используется для пагинации и фильтрации
fetch('/api/products', {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
  query: {
    category: 'php-scripts/add-ons',
    sort: 'sales',
    price_min: 10,
    price_max: 50,
    page: 1
  }
})
```

### 6. **Категории и подкатегории**

```
ГЛАВНЫЕ КАТЕГОРИИ:
├── PHP Scripts
│   ├── Add-ons
│   ├── Calendars
│   ├── Forms
│   ├── Shopping Carts
│   ├── Miscellaneous
│   └── ...
│
├── WordPress
│   ├── eCommerce (WooCommerce, EDD)
│   ├── Forms
│   ├── Plugins
│   └── ...
│
├── JavaScript
│   ├── Animations & Effects
│   ├── Charts & Graphs
│   ├── Forms
│   └── ...
│
├── HTML5
├── CSS
├── Mobile (iOS, Android, Flutter)
├── Plugins
└── ...
```

### 7. **Параметры сортировки**

```
SORT PARAMETER VALUES:
├── sort=sales       → По количеству продаж (Best sellers)
├── sort=date        → По дате добавления (Newest)
├── sort=rating      → По рейтингу (Highest rated)
└── sort=trending    → Популярные (Trending)
```

### 8. **Пагинация**

```
Вероятная схема:
- Параметр: ?page={PAGE_NUMBER}
- или ?offset={OFFSET}&limit={LIMIT}

Примеры:
https://codecanyon.net/category/php-scripts?page=2&sort=sales
https://codecanyon.net/category/php-scripts?offset=20&limit=20
```

### 9. **Статус кодов ответов**

```
200 OK           - Успешное получение данных
404 Not Found    - Категория не найдена
400 Bad Request  - Неверные параметры
503 Service Error - Сервис недоступен
```

---

**Итоговая схема URL:**
```
/category/{CATEGORY}[/{SUBCATEGORY}]?
    sort={sales|date|rating|trending}&
    price_min={NUMBER}&
    price_max={NUMBER}&
    date={any-date|this-year|this-month|this-week}&
    rating={4-plus|3-plus|1-plus}&
    on_sale={true|false}&
    page={NUMBER}&
    search={QUERY}
```

Сайт использует **Server-Side Routing** (SSR) с URL параметрами, а не JSON API. Все фильтры применяются через обновление URL и полную загрузку страницы.
