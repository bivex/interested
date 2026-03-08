## Capterra — HTML/CSS структура листингов и пагинации

---

### 1. Технологический стек

**Next.js 13+ App Router** с React Server Components (RSC). Это принципиально другой подход, чем G2:

- Первая загрузка — полный SSR HTML (сервер рендерит React компоненты)
- Навигация по фильтрам/страницам — `router.push()` через `history.pushState`, затем Next.js делает `fetch(url + ?_rsc=<id>)` с заголовками `RSC: 1` и получает RSC payload (не HTML) для частичного обновления DOM
- CSS: смесь **Tailwind CSS** + **CSS Modules** (обфусцированные классы типа `e1xzmg0z`, `c1ofrhif`, `sr2r3oj`)
- Кастомные Web Components: `<buyer-intent-session>`, `<buyer-intent-view>`, `<buyer-intent-subject>`, `<buyer-intent-click>` — для рекламного трекинга

---

### 2. Общая иерархия DOM

```
<body class="antialiased">
  <buyer-intent-session>        ← рекламный web component (трекинг сессии)
  ...RSC scripts (123 шт.)...   ← self.__next_f payload chunks

  <!-- Основной layout (Tailwind flex) -->
  <div class="e1xzmg0z swg2rt9 mt-6 flex flex-col gap-y-6 lg:mt-12">
    <buyer-intent-view>         ← обёртка для A/B экспериментов

      <!-- Хлебные крошки -->
      <nav class="e1xzmg0z be9etqu b1myuz3i">
        <a class="e1xzmg0z ljas29s ber4fu0">
          <i class="e1xzmg0z i6uwf7i icon-house"/>  ← иконка домика
        </a>
        <i class="icon-chevron-right"/>
        <span class="e1xzmg0z ber4fu0 bcx8gr8">CRM Software</span>
        <script type="application/ld+json">BreadcrumbList JSON-LD</script>
      </nav>

      <!-- Главный двухколоночный контейнер -->
      <div class="e1xzmg0z swg2rt9 xl:w-screen-xl
                  flex flex-col-reverse px-0
                  lg:flex-row-reverse lg:items-start lg:gap-x-10">

        <!-- ЛЕВАЯ КОЛОНКА: Фильтры (lg:w-1/4) -->
        <div class="top-0 mb-6 lg:mb-0 lg:w-1/4">
          ...
        </div>

        <!-- ПРАВАЯ КОЛОНКА: Листинги (flex-1) -->
        <div class="flex flex-1 flex-col gap-y-6 lg:ml-6">
          ...
        </div>

      </div>
    </buyer-intent-view>
  </div>
</body>
```

> **Важно:** `flex-col-reverse` + `lg:flex-row-reverse` — в мобиле фильтры снизу, на десктопе справа (но визуально слева из-за `flex-row-reverse`)

---

### 3. Левая колонка — Фильтры

```html
<div class="top-0 mb-6 lg:mb-0 lg:w-1/4">
  <div data-testid="filters-panel" class="space-y-8 lg:mb-10">

    <!-- Заголовок с количеством -->
    <div class="space-y-2 lg:space-y-4">
      <span class="e1xzmg0z typo-20 text-neutral-99 font-semibold typo-30">
        Filter (1405) Products:
      </span>

      <!-- Поиск по названию -->
      <div class="e1xzmg0z c1shnh79" data-testid="search-product-name">
        <i class="icon-magnifying-glass"/>
        <input class="e1xzmg0z i1drux4y bg-neutral-10 rounded-[100px]"
               data-status="default"
               placeholder="Search Product Name"/>
      </div>
    </div>

    <!-- Sort By dropdown -->
    <div data-testid="sortby-filter-section" class="space-y-2 lg:space-y-4">
      <span id="sortBy-filter" class="font-semibold">Sort By: ⓘ</span>
      <div class="e1xzmg0z d1bcfjxe w-full">
        <div data-testid="show-sortby-parent"
             class="tbhxjk6 border-neutral-40 flex w-full items-center gap-x-2 rounded-lg border">
          <span data-testid="show-sortby" class="e1xzmg0z flex-1">Sponsored</span>
          <i class="icon-chevron-down"/>
        </div>
        <!-- Выпадающий список -->
        <div class="e1xzmg0z c1ghu4k7 elevation-2 w-full">
          <div data-dropdown-item="true" data-testid="sortby-sponsored"
               class="i1mg93u5 pointer-events-none bg-neutral-20">Sponsored</div>
          <div data-dropdown-item="true" data-testid="sortby-highest_rated">Highest Rated</div>
          <div data-dropdown-item="true" data-testid="sortby-most_reviews">Most Reviews</div>
          <div data-dropdown-item="true" data-testid="sortby-alphabetical">Alphabetical</div>
        </div>
      </div>
    </div>

    <hr class="e1xzmg0z r1kmqxse !mt-7"/>

    <!-- Plan Type фильтр -->
    <div data-testid="pricing_options-filter-section" class="space-y-2 lg:space-y-4">
      <span class="font-semibold">Plan Type</span>
      <div class="border-neutral-40 flex flex-col gap-y-2 border-b pb-8">
        <!-- Чекбокс с Popular badge -->
        <label data-testid="checkbox-filter-pricing_options-FREE_TRIAL"
               class="e1xzmg0z i1091fzf c8c6pax flex items-center
                      CheckboxFilter-module__hVNKlW__promo">
          <input class="e1xzmg0z" type="checkbox"/>
          <span class="e1xzmg0z ioab8vg"/>     ← custom checkbox UI
          <span class="e1xzmg0z i1cxx4bu"/>
          <i class="icon-minus"/>
          <div class="flex items-center gap-2 whitespace-nowrap">Free Trial</div>
          <div class="CheckboxFilter-module__hVNKlW__popularBadge">Popular</div>
        </label>
        <!-- FREE_VERSION, PER_MONTH, PER_YEAR, ONE_TIME — аналогично -->
      </div>
    </div>

    <!-- Key Features -->
    <div class="space-y-2 lg:space-y-4">
      <span class="font-semibold">Key Features</span>
      <!-- Чекбоксы с UUID значениями -->
      <label data-testid="checkbox-filter-features-0019f365-3e1b-4e2f-8f1e-cb77ba025078">
        <input type="checkbox"/>
        Contact Management
      </label>
      <!-- ... другие фичи ... -->
    </div>

    <!-- Deployment -->
    <!-- data-testid="checkbox-filter-deployment-CLOUD_SAAS_WEB_BASED" -->
    <!-- data-testid="checkbox-filter-deployment-DESKTOP_MAC" / DESKTOP_WINDOWS / etc. -->

  </div>
</div>
```

---

### 4. Правая колонка — Листинги

```html
<div class="flex flex-1 flex-col gap-y-6 lg:ml-6">

  <!-- Список карточек (25 штук) -->
  <div class="mb-10 flex flex-col gap-y-10">

    <buyer-intent-subject/>              ← трекинг (перед каждой карточкой)
    <div id="product-card-container-{numericId}">
      ...карточка...
    </div>

    <!-- Повторяется 25 раз -->

  </div>

  <!-- Пагинация -->
  <div class="flex w-full flex-col gap-y-1 lg:py-8">
    <div class="flex flex-row items-center justify-center">
      <nav class="e1xzmg0z pk4dy8l">
        ...
      </nav>
    </div>
  </div>

</div>
```

---

### 5. Анатомия карточки продукта

#### Sponsored карточка (с "Visit Website")

```html
<div id="product-card-container-{numericId}">
  <!-- Внешняя рамка -->
  <div class="e1xzmg0z c1ofrhif w-full p-0
              border-neutral-40 shadow-2 rounded-2xl
              max-lg:overflow-hidden">

    <!-- Основная часть -->
    <div class="flex flex-col gap-y-6 pt-6 px-6">

      <!-- Шапка: лого + название + действия -->
      <div class="flex justify-between gap-x-4">
        <div class="flex gap-x-6">

          <!-- Лого -->
          <a class="e1xzmg0z tf6i4tz p-0 m1cjozd3 ijt8edw"
             data-evt-id="2143540603"
             data-evt-name="engagement_product_click"
             href="/p/{numericId}/{Product-Slug}/">
            <img data-nimg="1"
                 src="https://gdm-catalog-fmapi-prod.imgix.net/ProductLogo/{uuid}.png
                      ?auto=format,compress&fit=max&w=128&q=75"/>
          </a>

          <!-- Название + рейтинг -->
          <div class="flex flex-col gap-y-2">
            <!-- Название (SPONSORED) -->
            <a class="e1xzmg0z ljas29s typo-30 text-primary-80 w-fit font-bold">
              <h2 class="e1xzmg0z text-primary-80 typo-30 flex items-center"
                  data-testid="product-header-upgraded-link-{Slug}">
                {Product Name}
                <i class="icon-outbound"/>     ← иконка внешней ссылки
              </h2>
            </a>

            <!-- Рейтинг + кол-во отзывов (кликабельно) -->
            <div class="flex items-center gap-x-2">
              <a class="e1xzmg0z ljas29s s1ncqr9d hover:text-neutral-99 link"
                 data-evt-name="engagement_product_click">
                <span class="snsqh3h">               ← звёзды-иконки
                  <i class="icon-star-full" data-rating="1"/>
                  <i class="icon-star-full" data-rating="2"/>
                  <i class="icon-star-full" data-rating="3"/>
                  <i class="icon-star-full" data-rating="4"/>
                  <i class="icon-star-half" data-rating="5"/>
                </span>
                <span class="e1xzmg0z sr2r3oj">4.7 (715)</span>   ← рейтинг+отзывы
              </a>

              <!-- Sub-ratings expandable -->
              <span class="e1xzmg0z d1bcfjxe t150ptnh">
                <i class="icon-chevron-down imjh1x"/>
              </span>
              <!-- Раскрывающийся блок: Overall / Ease of Use / Customer Service / Features / Value for Money -->
              <div class="cg5sxaj b1c6qyun">
                <div class="e1xzmg0z c1ghu4k7 b1c6qyun cyd62s7 mt-1">
                  <div class="grid grid-cols-2 text-sm">
                    <div class="font-bold">Overall</div>
                    <div class="e1xzmg0z s1ncqr9d justify-end">
                      <span class="snsqh3h"><i class="icon-star-full"/>...</span>
                      <div class="w-6">4.7</div>    ← числовой рейтинг
                    </div>
                  </div>
                  <div class="grid grid-cols-2 mt-3 text-sm">
                    <div>Ease of Use</div>
                    <div class="w-6">4.7</div>
                  </div>
                  <!-- Customer Service, Features, Value for Money — аналогично -->
                </div>
              </div>
            </div>

            <!-- Capterra Shortlist badge (только sponsored) -->
            <div class="flex w-full flex-row items-center">
              <div class="from-primary-30 to-primary-70 mr-2 flex gap-4 rounded bg-gradient-to-r p-[1px]">
                <a class="e1xzmg0z b1phz12s p77bcp8 elevation-1 border-success-10
                          from-primary-0 to-primary-10 text-neutral-99 rounded border bg-gradient-to-r"
                   href="https://www.capterra.com/{category}/shortlist/">
                  <span class="e1xzmg0z be9etqu flex items-center gap-x-2">
                    <img/>   ← Shortlist badge SVG
                  </span>
                </a>
              </div>
            </div>

          </div>
        </div>

        <!-- Кнопки: Save (❤️) + CTA -->
        <div class="flex gap-x-3">
          <button data-testid="save-button" class="e1xzmg0z byb7w84 sli6p0m isqbcxv">
            <i class="icon-heart-empty"/>
          </button>
          <buyer-intent-click
            data-buyer-intent='{"productIds":["uuid"]}'
            data-event-name="/ad/clicked"
            data-trigger="click"
            event-name="/ad/clicked"
            product-id="uuid">
            <button class="e1xzmg0z byb7w84 p1hd3tcp group gap-1 w-full font-sans">
              Visit Website ↗       ← ТОЛЬКО у sponsored
            </button>
          </buyer-intent-click>
        </div>
      </div>

      <!-- Описание + Learn more -->
      <p class="text-neutral-99 typo-20">
        {description snippet}
        <a class="e1xzmg0z ljas29s link text-primary-80 no-underline hover:underline">
          Learn more about {Product Name}
        </a>
      </p>

      <!-- Ключевые функции -->
      <div data-testid="product-card-category-features">
        <p class="typo-10 pb-4 font-bold">CRM features reviewers most value</p>
        <div class="grid grid-flow-col grid-rows-4 gap-y-2 gap-x-4 lg:grid-rows-3">
          <div class="flex items-center">
            <i class="icon-check mr-2 text-success-80"/>
            Contact Management
          </div>
          <!-- 8 функций всего -->
        </div>
      </div>

    </div>

    <!-- Футер карточки -->
    <div class="border-neutral-30 flex items-center justify-between
                border-t py-2 px-6 lg:py-4 rounded-b-2xl">
      <!-- Compare чекбокс -->
      <div>
        <button class="t1s7oel5 type-20 text-neutral-95 h-6 border-0 p-0 font-normal">
          <label data-testid="compare-checkbox" class="e1xzmg0z i1091fzf c8c6pax">
            <input type="checkbox" class="e1xzmg0z"/>
            <span class="e1xzmg0z ioab8vg"/>   ← custom checkbox
            <span class="e1xzmg0z i1cxx4bu"/>
            <i class="icon-minus"/>
          </label>
        </button>
        Add to compare
      </div>
      <!-- Recommend % -->
      <div class="typo-20 text-success-95 flex flex-row items-center gap-x-2 font-medium">
        <i class="icon-thumb-up"/>
        88% recommend this product
      </div>
    </div>

  </div>
</div>
```

#### Non-Sponsored карточка (с "View Profile")

Отличия от sponsored:

```html
<!-- H2 имеет другой testid -->
<h2 data-testid="product-header-profile-link-{Slug}" class="e1xzmg0z">
  {Product Name}      <!-- без icon-outbound -->
</h2>

<!-- Название обёрнуто в <a> с другим классом -->
<a class="e1xzmg0z ljas29s typo-30 text-primary-80 w-fit text-center font-bold">

<!-- Нет Capterra Shortlist badge -->

<!-- CTA кнопка — View Profile, не Visit Website -->
<button data-testid="regular-product-button" class="e1xzmg0z byb7w84 sli6p0m px-8">
  View Profile
</button>
<!-- НЕТ buyer-intent-click wrapper, НЕТ кнопки с классом p1hd3tcp -->
```

---

### 6. Пагинация

```html
<nav class="e1xzmg0z pk4dy8l">

  <!-- << Первая страница -->
  <span class="sb pagination-item hover:bg-neutral-10 bg-transparent"
        data-page="1">
    <i class="icon-chevron-line-left"/>
  </span>

  <!-- < Предыдущая -->
  <span class="sb interactive pagination-item hover:bg-neutral-10 bg-transparent"
        data-page="1">
    <i class="icon-chevron-left"/>
  </span>

  <!-- Текущая страница (без ссылки, active стиль) -->
  <span class="e1xzmg0z p1k1mql1 rounded-sm p-2
               border-neutral-70 bg-neutral-10 border active"
        data-page="1">
    <span class="e1xzmg0z pointer-events-none no-underline">1</span>
  </span>

  <!-- Остальные страницы (с <a>) -->
  <span class="e1xzmg0z i1091fzf p1k1mql1 rounded-sm bg-transparent p-2
               hover:bg-neutral-30"
        data-page="2">
    <a class="e1xzmg0z ljas29s no-underline"
       href="/customer-relationship-management-software/?page=2">2</a>
  </span>
  <!-- Страницы 3..9 аналогично -->

  <!-- > Следующая -->
  <span class="sb interactive pagination-item hover:bg-neutral-10 bg-transparent"
        data-page="2">
    <a class="e1xzmg0z text-neutral-95"
       href="...?page=2">
      <i class="icon-chevron-right"/>
    </a>
  </span>

  <!-- >> Последняя -->
  <span class="sb interactive pagination-item hover:bg-neutral-10 bg-transparent"
        data-page="57">
    <a href="...?page=57">
      <i class="icon-chevron-line-right"/>
    </a>
  </span>

</nav>
```

---

### 7. URL параметры и механизм запросов

| Параметр | Значения | Описание |
|---|---|---|
| `page` | `1`..`57` | Страница (25 продуктов/страница) |
| `sort` | `sponsored`, `highest_rated`, `most_reviews`, `alphabetical` | Сортировка |
| `sortOrder` | `SPONSORED`, `HIGHEST_RATED`, `MOST_REVIEWS`, `ALPHABETICAL` | Legacy alias |
| `pricing_options` | `FREE_TRIAL,FREE_VERSION,PER_MONTH,PER_YEAR,ONE_TIME` | Тип плана (запятая) |
| `features` | `{uuid1},{uuid2},...` | UUID фич (запятая) |
| `deployment` | `CLOUD_SAAS_WEB_BASED,DESKTOP_MAC,DESKTOP_WINDOWS,DESKTOP_LINUX,ON_PREMISE_WINDOWS,ON_PREMISE_LINUX,DESKTOP_CHROMEBOOK,MOBILE_ANDROID,MOBILE_IPHONE,MOBILE_IPAD` | Платформы |

**Механизм навигации (Next.js App Router RSC):**
```
Пользователь кликает фильтр
  → router.push('?pricing_options=FREE_TRIAL')
  → history.pushState (URL меняется)
  → fetch('/customer-relationship-management-software/?pricing_options=FREE_TRIAL&_rsc=b5uel',
          { headers: { 'RSC': '1', 'Next-Router-State-Tree': '...' } })
  → Сервер возвращает RSC payload (не HTML)
  → React обновляет только изменённые Server Components в DOM
```

**Для программного скрапинга** (без браузера) — простой GET без `_rsc`:
```
GET https://www.capterra.com/customer-relationship-management-software/?page=2&sort=highest_rated
GET https://www.capterra.com/customer-relationship-management-software/?pricing_options=FREE_TRIAL,FREE_VERSION&page=1
GET https://www.capterra.com/customer-relationship-management-software/?features=0019f365-3e1b-4e2f-8f1e-cb77ba025078&page=3
```

---

### 8. CSS-селекторы для парсинга

| Что вытащить | Селектор |
|---|---|
| Контейнер всех карточек | `.mb-10.flex.flex-col.gap-y-10` |
| Одна карточка | `[id^="product-card-container-"]` |
| Numeric ID продукта | `card.id.replace('product-card-container-', '')` |
| URL продукта | `a[data-evt-name="engagement_product_click"][href]` → `href` |
| Название продукта | `h2[data-testid*="product-header"]` |
| Sponsored vs Organic | sponsored: `data-testid*="upgraded-link"` / organic: `data-testid*="profile-link"` |
| Рейтинг + отзывы | `.sr2r3oj` → `"4.7 (715)"` |
| Sub-рейтинги | `.grid.grid-cols-2.mt-3 .w-6` |
| Звёзды (count) | `i.icon-star-full[data-rating]` + `i.icon-star-half[data-rating]` |
| Логотип CDN | `a[data-evt-name] img` → `src` (imgix CDN) |
| Фичи продукта | `[data-testid="product-card-category-features"] .flex.items-center` |
| CTA кнопка тип | `button.p1hd3tcp` = sponsored / `[data-testid="regular-product-button"]` = organic |
| Рекомендации % | `.typo-20.text-success-95` → `"88% recommend..."` |
| Product UUID (ad) | `buyer-intent-click[product-id]` |
| Тотал продуктов | `span.typo-30.font-semibold` → `"Filter (1405) Products:"` |
| Текущая страница | `span.active[data-page]` |
| Последняя страница | `span.pagination-item[data-page]:last-of-type` |


Продолжаю с того места где оборвалось — после таблицы CSS-селекторов.

---

### 9. Дополнительные находки по карточкам

**Shortlist badge** — независим от типа карточки. Он может быть и у organic, и у sponsored. Это отдельный признак качества, не признак платного размещения:

```
sponsored + shortlist  → "Visit Website" + badge (Bigin, Less Annoying...)
sponsored - shortlist  → "Visit Website" без badge
organic   + shortlist  → "View Profile" + badge
organic   - shortlist  → "View Profile" без badge
```

**Product URL pattern** для парсинга — берётся из родительского `<a>` вокруг `<h2>`:

```
organic:   <a href="/p/{numericId}/{Slug}/">  → оборачивает h2
sponsored: <button class="link">              → h2 обёрнут в кнопку (без href!)
           + logo link: <a class="tf6i4tz" href="/p/{numericId}/{Slug}/">  ← URL здесь
```

То есть для sponsored карточки URL страницы продукта брать из **логотипа** (`a.tf6i4tz`), не из заголовка.

**Sub-рейтинги в DOM** — все данные присутствуют в HTML при SSR (даже когда панель визуально скрыта через `height: 8px`). При простом GET запросе они полностью доступны без JS:

```html
<!-- Скрытый блок, но данные есть в разметке -->
<div class="c1ghu4k7 b1c6qyun cyd62s7 mt-1">   ← height:8px через CSS
  Overall 4.9 / Ease of Use 4.8 / Customer Service 4.7 / Features 4.8 / Value for Money 4.7
</div>
```

---

### 10. Пагинация — важный нюанс

Числовые ссылки страниц **не имеют `href`** атрибута — они `<a>` без href, клик обрабатывается через Next.js router:

```html
<!-- Числа 1–9: href = null, навигация через JS -->
<span data-page="2" class="e1xzmg0z i1091fzf p1k1mql1 ...">
  <a class="">2</a>          ← нет href!
</span>

<!-- Только Next (►) и Last (►|) имеют реальный href -->
<span class="sb interactive pagination-item" data-page="2">
  <a class="e1xzmg0z text-neutral-95"
     href="/customer-relationship-management-software/?page=2">  ← есть href
    <i class="icon-chevron-right"/>
  </a>
</span>
<span class="sb interactive pagination-item" data-page="57">
  <a href="/customer-relationship-management-software/?page=57">
    <i class="icon-chevron-line-right"/>
  </a>
</span>
```

**Вывод для скрапера:** URL страниц нужно конструировать вручную — `?page=N`, не извлекать из DOM числовых кнопок.

**Текущая страница** определяется по классу `active` на `span`:
```html
<span class="e1xzmg0z p1k1mql1 ... border active" data-page="1">
```

**Последняя страница** — из `span.sb.interactive.pagination-item` с наибольшим `data-page` (или последний span с иконкой `icon-chevron-line-right`).

---

### 11. Механизм фильтров — детальный flow

```
Клик на чекбокс (React state update)
  ↓
router.push('/customer-relationship-management-software/?pricing_options=FREE_TRIAL')
  ↓
history.pushState() → URL в адресной строке меняется
  ↓
Next.js App Router делает:
  fetch('...?pricing_options=FREE_TRIAL&_rsc=b5uel', {
    headers: {
      'RSC': '1',
      'Next-Router-State-Tree': '...',
      'Next-Router-Prefetch': '1'
    }
  })
  ↓
Сервер возвращает RSC (React Flight) payload
  ↓
React обновляет только изменённые Server Components
  (список карточек, счётчик, пагинация)
```

При `503` на RSC запросе (rate limit/bot detection) Next.js fallback делает полный page reload.

---

### 12. Полная схема URL параметров

```
BASE: https://www.capterra.com/customer-relationship-management-software/

СТРАНИЦЫ:
  ?page=1..57          (25 продуктов/страница, 1405 всего)

СОРТИРОВКА (два синонима одновременно при клике из UI):
  ?sort=sponsored         &sortOrder=SPONSORED
  ?sort=highest_rated     &sortOrder=HIGHEST_RATED
  ?sort=most_reviews      &sortOrder=MOST_REVIEWS
  ?sort=alphabetical      &sortOrder=ALPHABETICAL

  При прямом GET достаточно одного: ?sort=highest_rated

ПЛАН/ЦЕНА (запятая = несколько):
  ?pricing_options=FREE_TRIAL
  ?pricing_options=FREE_TRIAL,FREE_VERSION
  ?pricing_options=FREE_TRIAL,FREE_VERSION,PER_MONTH,PER_YEAR,ONE_TIME

ФУНКЦИИ (UUID через запятую):
  ?features=0019f365-3e1b-4e2f-8f1e-cb77ba025078
  ?features={uuid1},{uuid2}

ПЛАТФОРМА:
  ?deployment=CLOUD_SAAS_WEB_BASED
  ?deployment=DESKTOP_MAC,DESKTOP_WINDOWS,MOBILE_ANDROID,MOBILE_IPHONE

КОМБИНАЦИЯ:
  ?page=2&sort=highest_rated&pricing_options=FREE_TRIAL&deployment=CLOUD_SAAS_WEB_BASED
```

---

### 13. Полная таблица CSS-селекторов (итоговая)

| Что вытащить | CSS-селектор / атрибут |
|---|---|
| **Все карточки на странице** | `[id^="product-card-container-"]` |
| **Numeric ID продукта** | `card.id.replace('product-card-container-', '')` |
| **URL продукта (organic)** | `a.ljas29s.typo-30[href]` (родитель h2) |
| **URL продукта (sponsored)** | `a.tf6i4tz[href]` (logo link) |
| **URL продукта (универсально)** | `a.tf6i4tz` → `getAttribute('href')` |
| **Название продукта** | `h2[data-testid*="product-header"]` → `textContent` |
| **Тип: sponsored vs organic** | `data-testid*="upgraded-link"` → sponsored; `data-testid*="profile-link"` → organic |
| **Рейтинг + кол-во отзывов** | `.sr2r3oj` → `"4.7 (715)"` |
| **Только число рейтинга** | `.sr2r3oj` → split `" ("` → `[0]` |
| **Только кол-во отзывов** | `.sr2r3oj` → match `\((\d+)\)` |
| **Суб-рейтинги (скрытые)** | `.c1ghu4k7 .grid.grid-cols-2.mt-3` → label + `.w-6` |
| **Overall рейтинг** | `.grid.grid-cols-2.text-sm .font-bold` + `.w-6` |
| **Звёзды (тип)** | `i.icon-star-full[data-rating]` count + `i.icon-star-half` |
| **Логотип src** | `a.tf6i4tz img` → `getAttribute('src')` |
| **Логотип CDN** | `gdm-catalog-fmapi-prod.imgix.net/ProductLogo/{uuid}.{ext}` |
| **CTA кнопка** | `button.p1hd3tcp` = "Visit Website" (sponsored) |
| | `[data-testid="regular-product-button"]` = "View Profile" (organic) |
| **Capterra Shortlist badge** | `a[class*="b1phz12s"]` |
| **Shortlist badge href** | `.../shortlist/` |
| **Ключевые фичи** | `[data-testid="product-card-category-features"] .flex.items-center` → `textContent` |
| **% рекомендаций** | `.text-success-95` → `"88% recommend this product"` |
| **Product UUID (ad трекинг)** | `buyer-intent-subject[product-id]` (перед карточкой) |
| **Ad click UUID** | `buyer-intent-click[product-id]` (внутри карточки) |
| **Тотал продуктов** | `span.typo-30.font-semibold` → `"Filter (1405) Products:"` |
| **Текущая страница** | `span[data-page].active` → `getAttribute('data-page')` |
| **Последняя страница** | `span.sb.interactive.pagination-item[data-page]:last-of-type` → `getAttribute('data-page')` |
| **Фильтр-панель** | `[data-testid="filters-panel"]` |
| **Sort By текущее** | `[data-testid="show-sortby"]` → `textContent` |
| **Все filter testId** | `[data-testid^="checkbox-filter-"]` → `data-testid` = `checkbox-filter-{param}-{value}` |

Вот полный блок про отзывы и пагинацию для Capterra — в той же структуре и детализации:

---

## Блок: Страница отзывов продукта — Reviews & Pagination

---

### 1. URL страницы отзывов

```
https://www.capterra.com/p/{numericId}/{Product-Slug}/reviews/
```

Пример:
```
https://www.capterra.com/p/204998/Bigin-by-Zoho-CRM/reviews/
```

Это полноценная **SSR-страница** (Next.js App Router). Доступна plain GET без браузера. Данные также дублируются в Schema.org JSON-LD (тег `<script type="application/ld+json">`).

---

### 2. URL-параметры — фильтры и пагинация

> **Критически важное открытие:** Capterra использует **смешанную модель** фильтрации — часть фильтров серверная (меняют URL и делают RSC-запрос), часть только клиентская (фильтруют из уже загруженных 25 отзывов без запроса к серверу).

#### Серверные фильтры (попадают в URL, делают новый запрос):

| Параметр | Значения | Описание |
|---|---|---|
| `page` | 1, 2, … N | Номер страницы (25 отзывов на странице) |
| `overallRating` | `rating5`, `rating4`, `rating3`, `rating2`, `rating1` | Фильтр по звёздному рейтингу (одно значение) |
| `sort` | `HIGHEST_COMPLETENESS_SCORE`, `MOST_RECENT`, `HIGHEST_RATED`, `LOWEST_RATED` | Сортировка |

#### Клиентские фильтры (НЕ попадают в URL, фильтруют DOM на стороне браузера):

| Параметр (name) | Значения (value) | Описание |
|---|---|---|
| `companySize` | `companySizeSelf`, `companySize1To10`, `companySize11To50`, `companySize51To200`, `companySize201To500`, `companySize501To1000`, `companySize1001To5000`, `companySize5001To10000`, `companySize10001Up` | Размер компании |
| `role` | `user`, `administrator`, `teamOrHelped` | Роль пользователя |
| `timeUsedProduct` | `freeTrial`, `lessThan6Months`, `6To12Months`, `1To2Years`, `2YearsUp` | Срок использования |
| `frequencyUsedProduct` | `daily`, `weekly`, `monthly`, `frequencyother` | Частота использования |

> **Важно:** Клиентские фильтры работают только среди 25 уже загруженных на страницу отзывов. При смене страницы они сбрасываются.

#### Примеры URL:

```
# Страница 1, сортировка по умолчанию
GET /p/{id}/{Slug}/reviews/

# Страница 2
GET /p/{id}/{Slug}/reviews/?page=2

# Только 5-звёздочные, самые свежие
GET /p/{id}/{Slug}/reviews/?overallRating=rating5&sort=MOST_RECENT

# 4-звёздочные, страница 3, самые полезные
GET /p/{id}/{Slug}/reviews/?overallRating=rating4&sort=HIGHEST_COMPLETENESS_SCORE&page=3

# 1-звёздочные, самые низкие
GET /p/{id}/{Slug}/reviews/?overallRating=rating1&sort=LOWEST_RATED
```

> **Важно:** Ссылки в пагинаторе (числовые кнопки) содержат только `?page=N` без активных серверных фильтров — при клике фильтр по overallRating теряется. Для скрапинга URL нужно конструировать вручную.

---

### 3. Технология фильтрации (RSC + PJAX аналог)

```
Пользователь кликает checkbox фильтра (overallRating)
  ↓
Next.js App Router вызывает router.push()
  ↓
history.pushState() → URL в браузере обновляется
  ↓
fetch('/p/{id}/{Slug}/reviews/?overallRating=rating5&sort=MOST_RECENT&_rsc=wcgaq', {
    headers: { 'RSC': '1', 'Next-Router-State-Tree': '...' }
  })
  → 503 (bot detection срабатывает на RSC запрос)
  ↓
Fallback: POST /p/{id}/{Slug}/reviews/?overallRating=rating5&sort=MOST_RECENT
  → 200 (plain POST проходит)
  ↓
React обновляет только список отзывов и пагинацию в DOM
```

---

### 4. Общая DOM-структура страницы отзывов

```html
<buyer-intent-view>
  <div class="sb screen-container flex lg:gap-x-8">

    <!-- ПРАВАЯ КОЛОНКА: sticky sidebar (product info + write review button) -->
    <div class="sticky top-0">
      <img>  <!-- логотип -->
      <span data-testid="productslug">Bigin by Zoho CRM</span>
      <span class="sr2r3oj">4.7 (715)</span>    <!-- overall rating + count -->
      <button data-testid="visit-website-button">Visit Website</button>
      <button data-testid="demo-button">Demo</button>
    </div>

    <!-- ЛЕВАЯ КОЛОНКА: основной контент -->
    <div class="flex w-full flex-col gap-y-12 lg:max-w-[70%]">

      <!-- Секция 1: Заголовок + мини-рейтинги -->
      <div class="flex flex-col gap-y-6">
        <h1 class="e1xzmg0z d72np9t">Reviews of {Product Name}</h1>
        <div class="flex w-full flex-col justify-between gap-y-6 md:flex-row">
          <div class="flex w-full items-center justify-between">
            <span>Ease of use</span>
            <span class="sr2r3oj">4.7</span>
          </div>
          <div class="border-l-1 border-neutral-40 mx-6 hidden md:visible md:block"/>
          <div class="flex w-full items-center justify-between">
            <span>Customer Service</span>
            <span class="sr2r3oj">4.5</span>
          </div>
        </div>
      </div>

      <!-- Секция 2: Pros and Cons (Featured review cards) -->
      <div class="flex flex-col gap-y-6">
        <h2 class="e1xzmg0z hpgn492">Pros and Cons in Reviews</h2>
        <button class="sli6p0m">Write a review</button>
        <!-- краткие Featured отзывы (2-3 штуки) -->
      </div>

      <!-- Секция 3: Фильтры + счётчик -->
      <div class="mb-6 flex flex-col gap-y-6">
        <h2 class="e1xzmg0z hpgn492">Showing most helpful reviews</h2>
        <span class="typo-30 font-semibold">Showing 1-25 of 715 Reviews</span>
        <button class="sli6p0m">Sort & Filter</button>
        <!-- фильтр-панель (мобильный аккордеон) -->
      </div>

      <!-- Секция 4: Список отзывов (25 штук) + пагинация -->
      <div class="flex scroll-mt-[200px] flex-col gap-y-6" data-testid="...">
        <!-- 25 обёрток с отзывами -->
        <div>  <!-- wrapper -->
          <div class="e1xzmg0z c1ofrhif typo-10 mb-6 space-y-4 p-6 lg:space-y-6">
            <!-- карточка отзыва -->
          </div>
        </div>
        <!-- ... -->

        <!-- Пагинация -->
        <div class="flex w-full flex-col" data-testid="pagination-section">
          <div class="flex flex-row items-center justify-center">
            <nav class="e1xzmg0z pk4dy8l">...</nav>
          </div>
        </div>
      </div>

      <!-- JSON-LD Schema -->
      <script type="application/ld+json">
        {"@type": "SoftwareApplication", "aggregateRating": {...}, "review": [...25 reviews...]}
      </script>

    </div>
  </div>
</buyer-intent-view>
```

---

### 5. Анатомия одной карточки отзыва

```html
<!-- Внешняя обёртка -->
<div class="e1xzmg0z c1ofrhif typo-10 mb-6 space-y-4 p-6 lg:space-y-6">

  <!-- Главный flex-контейнер -->
  <div class="flex flex-col gap-8">

    <!-- === СЕКЦИЯ 1: Reviewer info === -->
    <div class="flex justify-between">
      <div class="flex w-full flex-row flex-wrap justify-between gap-x-6">

        <!-- Аватар (фото или инициалы) -->
        <div class="e1xzmg0z ajdk2qt bg-primary-20 lg h-12 w-12 shrink-0 overflow-hidden rounded-full">
          <!-- Вариант A: фото -->
          <img data-testid="reviewer-profile-pic"
               alt="Robert G. avatar"
               src="https://www.capterra.com/assets-bx-capterra/_next/image?url=https%3A%2F%2Freviews.capterra.com%2Fcdn%2Fprofile-images%2F...">
          <!-- Вариант B: инициалы (текстовый узел в div) -->
          <!-- <div class="ajdk2qt ...">DW</div>  ← "Dee W." → "DW" -->
        </div>

        <!-- Кнопка "Helpful / Not helpful" -->
        <div><!-- thumbs up/down --></div>

        <!-- Имя + должность + компания + срок использования -->
        <div class="typo-10 text-neutral-90 w-full lg:w-fit">
          <span class="typo-20 text-neutral-99 font-semibold">Robert G.</span><br>
          Ownert<br>                         <!-- ← должность (text node) -->
          Construction<br>                   <!-- ← отрасль/компания (text node) -->
          Used the software for: <!-- -->I used a free trial  <!-- ← срок (text node + span) -->
        </div>

      </div>
    </div>

    <!-- === СЕКЦИЯ 2: Review content === -->
    <div class="space-y-4 lg:space-y-6">

      <!-- Заголовок + дата + рейтинг -->
      <div class="flex flex-col gap-y-2 lg:justify-between">

        <!-- Заголовок + дата -->
        <div class="space-y-1">
          <h3 class="typo-20 font-semibold">
            "Great CRM with alot of features"
          </h3>
          <div class="typo-0 text-neutral-90">February 16, 2026</div>
        </div>

        <!-- Рейтинг (звёзды + число + подрейтинги) -->
        <div class="sm:w-fit">
          <div class="e1xzmg0z d1bcfjxe text-neutral-99">  ← dropdown wrapper

            <!-- Visible: Overall rating row -->
            <div class="flex w-fit items-center gap-x-2">
              <div class="typo-20 text-neutral-99 flex cursor-pointer flex-wrap justify-between">
                <div class="e1xzmg0z s1ncqr9d" data-testid="rating">
                  <span class="snsqh3h">
                    <i class="e1xzmg0z i6uwf7i s8onb8d icon-star-full" data-rating="1" role="img" aria-label="star-full"/>
                    <i class="icon-star-full" data-rating="2"/>
                    <i class="icon-star-full" data-rating="3"/>
                    <i class="icon-star-full" data-rating="4"/>
                    <i class="icon-star-full" data-rating="5"/>
                    <!-- для 4.5: последняя звезда = icon-star-half -->
                  </span>
                  <span class="e1xzmg0z sr2r3oj">5.0</span>  ← числовой рейтинг
                </div>
              </div>
              <i class="icon-chevron-down"/>
            </div>

            <!-- Hidden dropdown: sub-ratings (в DOM всегда, CSS height скрывает) -->
            <div class="cg5sxaj b1c6qyun"/>   ← backdrop
            <div class="e1xzmg0z c1ghu4k7 l1ix9ysh b1c6qyun shadow-2 rounded-2 z-20 w-full space-y-4 p-4">

              <!-- Overall Rating -->
              <div class="typo-20 text-neutral-99 flex cursor-pointer flex-wrap justify-between gap-x-6">
                <span class="text-neutral-95 whitespace-nowrap">Overall Rating</span>
                <div data-testid="Overall Rating-rating" class="e1xzmg0z s1ncqr9d">
                  <span class="snsqh3h">
                    <i class="icon-star-full" data-rating="1" aria-label="star-full"/>
                    <!-- ... 5 stars ... -->
                  </span>
                  <span class="e1xzmg0z sr2r3oj">5.0</span>
                </div>
              </div>

              <!-- Ease of Use -->
              <div class="...">
                <span class="text-neutral-95 whitespace-nowrap">Ease of Use</span>
                <div data-testid="Ease of Use-rating" class="e1xzmg0z s1ncqr9d">
                  <span class="snsqh3h"><i class="icon-star-full" data-rating="1"/></span>
                  <!-- Capterra: 5 stars полных / неполных = значение *1. НО: только 1 <i> если 1 звезда etc  -->
                  <span class="e1xzmg0z sr2r3oj">5.0</span>
                </div>
              </div>

              <!-- Customer Service -->
              <div data-testid="Customer Service-rating">...</div>

              <!-- Features -->
              <div data-testid="Features-rating">...</div>

              <!-- Value for Money -->
              <div data-testid="Value for Money-rating">...</div>

              <!-- Likelihood to Recommend (прогресс-бар, не звёзды) -->
              <div class="...">
                <span class="text-neutral-95 whitespace-nowrap">Likelihood to Recommend</span>
                <div class="flex items-center gap-x-2">
                  <div data-testid="Likelihood to Recommend-rating"
                       class="e1xzmg0z p1wosrpd border-neutral-99 bg-neutral-99 rounded-0 flex h-1 w-[100px]">
                    <div class="bavdpqa" style="width:100%"/>  ← ширина = процент
                    <progress max="10" value="10" style="display:none">100%</progress>
                  </div>
                  10/10   ← текстовое значение
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Overview text -->
      <div class="!mt-4 space-y-6">
        <p>So far its simple to use and looks like it will do what I want...</p>
      </div>

      <!-- "Continue reading" button (если текст обрезан) -->
      <button data-testid="continue-reading-button"
              class="e1xzmg0z byb7w84 t1s7oel5 p-0 text-[16px] font-semibold hidden">
        Continue reading
      </button>

      <!-- Pros + Cons + дополнительные секции -->
      <div class="space-y-6">

        <!-- Pros -->
        <div class="space-y-2">
          <span>Pros</span>
          <p>{текст плюсов}</p>
        </div>

        <!-- Cons -->
        <div class="space-y-2">
          <span>Cons</span>
          <p>{текст минусов}</p>
        </div>

        <!-- Alternatives considered (опционально) -->
        <div class="space-y-2">
          <span class="whitespace-nowrap">Alternatives considered</span>
          <!-- Список через <span class="typo-10 whitespace-nowrap font-normal"> -->
          <span class="typo-10 whitespace-nowrap font-normal">HubSpot CRM</span>
          <span class="typo-10 whitespace-nowrap font-normal">Pipedrive</span>
        </div>

        <!-- Reason for switching (опционально) -->
        <div class="space-y-2">
          <span class="font-semibold">Reason for choosing {Product}</span>
          <p>{текст}</p>
        </div>

        <!-- Switched from (опционально) -->
        <div class="space-y-2">
          <span class="font-semibold">Reasons for switching to {Product}</span>
          <p>{текст}</p>
        </div>

        <!-- Review Source -->
        <div class="flex items-center gap-1">
          <span id="review-source-label">Review Source</span>
          <span class="e1xzmg0z d1bcfjxe t150ptnh">
            <i class="icon-circle-question"/>
            <!-- tooltip: "Non-incentivized review: any software user can leave a review..." -->
            <div role="dialog" class="e1xzmg0z c1ghu4k7 l1ix9ysh ...">
              Non-incentivized review: any software user can leave a review for any product...
            </div>
          </span>
        </div>

        <!-- "View less" button (когда текст развёрнут) -->
        <button data-testid="view-less-button">View less</button>

      </div>
    </div>
  </div>
</div>
```

---

### 6. Звёзды: логика icon-star-full / icon-star-half

Capterra использует **иконочный шрифт** (не SVG). В sub-ratings особенность: количество тегов `<i>` в `.snsqh3h` span НЕ всегда равно 5 — количество иконок определяется именно количеством `<i>` (только заполненные). Для точного рейтинга используй `.sr2r3oj` (числовое значение):

| Элемент | Содержимое |
|---|---|
| `i.icon-star-full` | Полная звезда |
| `i.icon-star-half` | Половина звезды |
| `i.icon-star-empty` | Пустая звезда |
| `.e1xzmg0z.sr2r3oj` | Числовой рейтинг, например `"5.0"` или `"4.5"` |

Числовой рейтинг в sub-рейтингах **всегда надёжнее** для парсинга, чем подсчёт иконок.

---

### 7. Пагинация отзывов

```html
<nav class="e1xzmg0z pk4dy8l" data-testid="pagination-section">

  <!-- |◄ Первая страница (disabled на стр.1) -->
  <span class="sb pagination-item hover:bg-neutral-10 bg-transparent" data-page="1">
    <span class="e1xzmg0z text-neutral-50">  ← disabled = text-neutral-50
      <i class="icon-chevron-line-left"/>
    </span>
  </span>

  <!-- ◄ Предыдущая (disabled на стр.1) -->
  <span class="sb interactive pagination-item hover:bg-neutral-10 bg-transparent" data-page="1">
    <span class="e1xzmg0z text-neutral-50">
      <i class="icon-chevron-left"/>
    </span>
  </span>

  <!-- Текущая страница (active, без <a>) -->
  <span class="e1xzmg0z p1k1mql1 rounded-sm bg-transparent p-2
               border-neutral-70 bg-neutral-10 border active"
        data-page="1">
    <span class="e1xzmg0z pointer-events-none no-underline">1</span>
  </span>

  <!-- Числовые страницы (с <a>) -->
  <span class="e1xzmg0z i1091fzf p1k1mql1 rounded-sm bg-transparent p-2
               hover:bg-neutral-30 hover:border-neutral-70 hover:border"
        data-page="2">
    <a class="e1xzmg0z ljas29s no-underline"
       href="/p/{id}/{Slug}/reviews/?page=2">2</a>
  </span>
  <!-- страницы 3, 4, 5 — аналогично -->

  <!-- ► Следующая (с <a> и href) -->
  <span class="sb interactive pagination-item hover:bg-neutral-10 bg-transparent"
        data-page="2">
    <a class="e1xzmg0z text-neutral-95"
       href="/p/{id}/{Slug}/reviews/?page=2">
      <i class="icon-chevron-right"/>
    </a>
  </span>

  <!-- ►| Последняя (с <a> и href) -->
  <span class="sb interactive pagination-item hover:bg-neutral-10 bg-transparent"
        data-page="29">
    <a href="/p/{id}/{Slug}/reviews/?page=29">
      <i class="icon-chevron-line-right"/>
    </a>
  </span>

</nav>
```

**Детали пагинации отзывов:**

- **25 отзывов на странице** (в отличие от 25 продуктов на страницах категорий — то же число, но разные данные)
- `715 reviews ÷ 25 = 29 pages`
- Активная страница: `span.active[data-page]` — без `<a>`, с классом `active`
- Disabled кнопки: `span.text-neutral-50` внутри → иконка неактивна
- Числа страниц (2–5): есть `<a href>` → **href содержит ТОЛЬКО `?page=N`**, без активных серверных фильтров
- Последняя страница: `span.sb.interactive.pagination-item[data-page]:last-child` → `data-page="29"` + `<a href>`

---

### 8. Фильтр-панель (Sort & Filter)

Панель открывается по кнопке `button.sli6p0m "Sort & Filter"`. В мобильном виде это аккордеон со скрытым `div.fcs8s7v`. Все фильтры имеют `data-testid` по паттерну `filter-{group}-{value}-mobile`:

```html
<!-- Sort section -->
<div data-testid="filter-sort-mobile">
  <!-- radio inputs name="radio" -->
  <label data-testid="filter-sort-HIGHEST_COMPLETENESS_SCORE-mobile">
    <input type="radio" name="radio" value="HIGHEST_COMPLETENESS_SCORE">  Most Helpful
  </label>
  <label data-testid="filter-sort-MOST_RECENT-mobile">
    <input type="radio" name="radio" value="MOST_RECENT">  Most Recent
  </label>
  <label data-testid="filter-sort-HIGHEST_RATED-mobile">
    <input type="radio" name="radio" value="HIGHEST_RATED">  Highest Rating
  </label>
  <label data-testid="filter-sort-LOWEST_RATED-mobile">
    <input type="radio" name="radio" value="LOWEST_RATED">  Lowest Rating
  </label>
</div>

<!-- Overall Rating (SERVER-SIDE) -->
<div data-testid="filter-overallRating-mobile">
  <label data-testid="filter-overallRating-5-mobile">
    <input type="checkbox" name="overallRating" value="rating5">  5.0
  </label>
  <!-- rating4, rating3, rating2, rating1 -->
</div>

<!-- Company Size (CLIENT-SIDE ONLY) -->
<div data-testid="filter-companySize-mobile">
  <label data-testid="filter-companySize-A-mobile">
    <input type="checkbox" name="companySize" value="companySizeSelf">  Self-employed
  </label>
  <label data-testid="filter-companySize-B-mobile">
    <input type="checkbox" name="companySize" value="companySize1To10">  1-10 employees
  </label>
  <!-- ...до companySize10001Up -->
</div>

<!-- User Role (CLIENT-SIDE ONLY) -->
<div data-testid="filter-role-mobile">
  <label data-testid="filter-role-User-mobile">
    <input type="checkbox" name="role" value="user">  User
  </label>
  <label data-testid="filter-role-Administrator-mobile">
    <input type="checkbox" name="role" value="administrator">  Administrator
  </label>
  <label data-testid="filter-role-TeamMember,HelpedInPurchase-mobile">
    <input type="checkbox" name="role" value="teamOrHelped">  Other
  </label>
</div>

<!-- Time Used (CLIENT-SIDE ONLY) -->
<div data-testid="filter-timeUsedProduct-mobile">
  <input name="timeUsedProduct" value="freeTrial"> Free Trial
  <input name="timeUsedProduct" value="lessThan6Months"> Less than 6 months
  <input name="timeUsedProduct" value="6To12Months"> 6-12 months
  <input name="timeUsedProduct" value="1To2Years"> 1-2 years
  <input name="timeUsedProduct" value="2YearsUp"> 2+ years
</div>

<!-- Frequency Used (CLIENT-SIDE ONLY) -->
<div data-testid="filter-frequencyUsedProduct-mobile">
  <input name="frequencyUsedProduct" value="daily"> Daily
  <input name="frequencyUsedProduct" value="weekly"> Weekly
  <input name="frequencyUsedProduct" value="monthly"> Monthly
  <input name="frequencyUsedProduct" value="frequencyother"> Other
</div>
```

---

### 9. Schema.org JSON-LD — бонус для парсинга

Capterra встраивает в каждую страницу отзывов `<script type="application/ld+json">` с полными данными о продукте и **всеми 25 отзывами текущей страницы** в машиночитаемом формате:

```json
{
  "@type": "SoftwareApplication",
  "name": "Bigin by Zoho CRM",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.7,
    "reviewCount": 715
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Robert G." },
      "reviewBody": "Great CRM with alot of features",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": 5,
        "bestRating": 5,
        "worstRating": 1
      }
    }
    // ... 24 более отзыва
  ]
}
```

> Это самый чистый способ парсинга без риска поломки от CSS-изменений.

---

### 10. CSS-селекторы для парсинга отзывов

| Что вытащить | Селектор / метод |
|---|---|
| **Список отзывов (контейнер)** | `.flex.scroll-mt-\\[200px\\].flex-col.gap-y-6` |
| **Одна карточка** | `div.c1ofrhif.typo-10.mb-6.p-6` |
| **Имя рецензента** | `.typo-20.text-neutral-99.font-semibold` (span) |
| **Должность / отрасль / срок** | text-узлы в `.typo-10.text-neutral-90.w-full` → `textContent.split('\n')` |
| **Аватар-фото** | `img[data-testid="reviewer-profile-pic"]` → `src` |
| **Аватар-инициалы** | `.ajdk2qt` → textContent, если нет img внутри |
| **Заголовок отзыва** | `h3.typo-20.font-semibold` |
| **Дата отзыва** | `div.typo-0.text-neutral-90` |
| **Overall рейтинг (числовой)** | `[data-testid="rating"] .sr2r3oj` |
| **Overall рейтинг (звёзды)** | `[data-testid="rating"] .snsqh3h i.icon-star-full` — подсчёт + `.icon-star-half` |
| **Sub-рейтинг (Overall)** | `[data-testid="Overall Rating-rating"] .sr2r3oj` |
| **Sub-рейтинг (Ease of Use)** | `[data-testid="Ease of Use-rating"] .sr2r3oj` |
| **Sub-рейтинг (Customer Service)** | `[data-testid="Customer Service-rating"] .sr2r3oj` |
| **Sub-рейтинг (Features)** | `[data-testid="Features-rating"] .sr2r3oj` |
| **Sub-рейтинг (Value for Money)** | `[data-testid="Value for Money-rating"] .sr2r3oj` |
| **Likelihood to Recommend** | `[data-testid="Likelihood to Recommend-rating"] progress` → `value/max` или соседний text `10/10` |
| **Текст обзора (overview)** | `.\\!mt-4.space-y-6 p` |
| **Pros текст** | первый `.space-y-2` внутри `.space-y-6` → `p` |
| **Cons текст** | второй `.space-y-2` → `p` |
| **Alternatives considered** | `span.whitespace-nowrap` + соседние `span.typo-10.whitespace-nowrap.font-normal` |
| **Reason for choosing** | `span.font-semibold` содержащий "Reason for" + `p` рядом |
| **Источник отзыва** | `#review-source-label` → "Review Source" (всегда одинаковый) |
| **Общий счётчик** | `span.typo-30.font-semibold` → "Showing 1-25 of 715 Reviews" |
| **Текущая страница** | `span[data-page].active` → `getAttribute('data-page')` |
| **Последняя страница** | `span.sb.interactive.pagination-item[data-page]:last-child` → `data-page` |
| **Schema.org данные** | `script[type="application/ld+json"]:last-of-type` → JSON.parse → `.review[]` |
