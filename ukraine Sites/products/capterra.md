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
