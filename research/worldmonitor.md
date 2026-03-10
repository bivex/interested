Вот полная картина того, откуда SPA `worldmonitor.app` берёт данные через XHR/Fetch:

---

## Основной API-сервер

Все запросы идут на `https://api.worldmonitor.app/api/` — собственный бэкенд проекта. Он делится на несколько функциональных групп:

---

### 🛢 Картографические ресурсы (статика)
- `maps.worldmonitor.app/countries.geojson` — контуры стран
- `maps.worldmonitor.app/country-boundary-overrides.geojson` — переопределения границ
- `pub-8ace9f6a86d74cb2bd5eb1de5590dd9e.r2.dev/planet.pmtiles` — векторные тайлы карты (Cloudflare R2, формат PMTiles)
- `protomaps.github.io/basemaps-assets/` — спрайты и шрифты для рендеринга карты (Protomaps open-source)

---

### ✈️ Военные и авиационные данные
- `/api/military-flights` — военные рейсы
- `/api/military/v1/get-usni-fleet-report` — отчёт о флоте от USNI (US Naval Institute)
- `/api/military/v1/get-aircraft-details-batch` (POST) — детальная информация по пачке самолётов
- `/api/military/v1/get-wingbits-status` — статус из Wingbits (краудсорсинговый ADS-B)

---

### 🚢 Морской трафик
- `/api/ais-snapshot?candidates=true` — снимок AIS-данных (Automatic Identification System судов)
- `/api/infrastructure/v1/get-temporal-baseline?type=vessels` — исторический базис по кол-ву судов

---

### 📰 Новостная лента
- `/api/news/v1/list-feed-digest?variant=full&lang=ru` — агрегированный дайджест новостей
- `/api/news/v1/summarize-article-cache` (GET) — кэшированные AI-саммари статей
- `/api/news/v1/summarize-article` (POST) — генерация новых саммари

---

### 📡 RSS-прокси (через собственный бэкенд)
Бэкенд агрегирует RSS от внешних источников и отдаёт их через `/api/rss-proxy?url=...`:
- `travel.state.gov` (Госдеп США — туристические предупреждения)
- `gov.uk` (МИД Великобритании)
- `safetravel.govt.nz` (Новая Зеландия)
- Посольства США в ~10 странах (Таиланд, ОАЭ, Германия, Украина, Мексика, Индия, Пакистан, Колумбия, Польша, Бангладеш, Италия, Доминикана, Мьянма)
- `cdc.gov` (уведомления о путешествиях/эпидемиях)
- `ecdc.europa.eu` (Европейский центр по профилактике болезней)
- `who.int` + `afro.who.int` (ВОЗ)

---

### 🚨 Системы предупреждений
- `/api/oref-alerts` + `/api/oref-alerts?endpoint=history` — израильская система оповещений Oref (ракетные тревоги)
- `/api/gpsjam` — данные о GPS-глушении (вероятно, gpsjam.org)
- `/api/telegram-feed?limit=50` — агрегированные Telegram-каналы (OSINT)

---

### 🧠 Аналитика / интеллект
- `/api/intelligence/v1/classify-event?title=...` — AI-классификация новостных событий по заголовку
- `/api/displacement/v1/get-population-exposure?mode=exposure&lat=...&lon=...&radius=50` — оценка воздействия на население вокруг координат конфликтных точек
- `/api/infrastructure/v1/get-temporal-baseline` — исторический базис (полёты, суда) для детекции аномалий
- `/api/infrastructure/v1/record-baseline-snapshot` (POST) — запись снэпшота текущего состояния
- `/api/bootstrap?keys=techReadiness` — конфигурация приложения при старте

---

### Итог архитектуры

SPA не ходит напрямую к сторонним источникам — весь трафик проксируется через `api.worldmonitor.app`. Внешние данные (RSS, AIS, Oref, Wingbits, USNI) забирает сам бэкенд, обогащает через AI (саммари, классификация событий), кэширует и отдаёт фронтенду единым API. Карта рендерится через **Protomaps** с тайлами на Cloudflare R2.
