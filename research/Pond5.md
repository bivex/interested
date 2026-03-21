## 🎵 Полный анализ Pond5 Music API — сводка для еженедельных отчётов

---

### 🔑 ГЛАВНЫЙ ЭНДПОИНТ

```
GET https://www.pond5.com/ru/index.php
```

**Обязательные заголовки:**
```
X-Requested-With: XMLHttpRequest
```

---

### 📋 ПАРАМЕТРЫ ЗАПРОСА

| Параметр | Тип | Описание | Значения |
|---|---|---|---|
| `page` | string | Тип запроса | всегда `ajax_search` |
| `bmtext` | string | Тип медиа | `music` (или `video`, `sfx`) |
| `bm` | int | Bitmask медиа | `16` для музыки |
| `pagenum` | int | Номер страницы | 1, 2, 3... |
| `perPage` | int | Треков на страницу | `48`, `96`, `120` |
| `sb` | int | **Сортировка** | см. ниже |
| `q` | string | Поисковые фильтры | см. ниже (space-separated) |
| `qorg` | string | Источник поиска | `sr` (search results) |
| `searchLayout` | string | Тип отображения | `paginated` / `list` |
| `previewSize` | string | Размер превью | `large` |
| `currency` | string | Валюта | `USD`, `EUR`, и т.д. |

---

### 🔢 ЗНАЧЕНИЯ СОРТИРОВКИ (`sb`)

```
sb=1   → Оптимальные (most_relevant)
sb=8   → Популярное ← ДЛЯ ОТЧЁТОВ ИСПОЛЬЗУЙ ЭТО
sb=6   → Самые новые
sb=4   → Цена ↑ (по возрастанию)
sb=3   → Цена ↓ (по убыванию)
sb=5   → Длительность ↑ (от короткого)
sb=10  → Длительность ↓ (от длинного)
```

---

### 🎛️ ПАРАМЕТРЫ ФИЛЬТРАЦИИ (параметр `q`, через пробел)

**Жанры** (`genre:ЗНАЧЕНИЕ`):
```
genre:ambient      genre:orchestral   genre:dance
genre:chillout     genre:folk         genre:funk
genre:hiphop       genre:holiday      genre:jazz
genre:kids         genre:corporate    genre:videogame
genre:rock         genre:reggae       genre:world
```

**Настроения** (`mood:ЗНАЧЕНИЕ`):
```
mood:action        mood:aggressive    mood:cinematic
mood:chill         mood:dark          mood:funny
mood:happy         mood:inspirational mood:romantic
mood:sad           mood:suspense
```

**Темп (BPM)**:
```
bpmlt:80                    → Медленно (< 80 BPM)
bpmbetween:80|129           → Среднее (80–129 BPM)
bpmgt:129                   → Быстро (> 129 BPM)
bpmgte:100                  → больше или равно 100
```

**Длительность** (в секундах):
```
durationlt:60               → до 1 минуты
durationbetween:60|180      → 1–3 минуты
durationgt:300              → больше 5 минут
```

**Цена** (в USD):
```
pricelt:20                  → до $20
pricebetween:10|50          → $10–$50
```

**Коллекции и прочее**:
```
collection:premiumbeat      → только PremiumBeat
misc:nopro                  → Не принадлежит P.R.O.
artist:USERNAME             → поиск по автору
```

**Комбинирование** — через пробел (URL-encoded `%20`):
```
q=genre:corporate+mood:inspirational+bpmbetween:80|129
```

---

### 📦 СТРУКТУРА ОТВЕТА

```json
{
  "status": 200,
  "viewType": "music",
  "output": {
    "searchTrackingId": "uuid",
    "count": 2886689,
    "countFormatted": "2,886,689",
    "pageCount": 60140,
    "itemsPerPage": 48,
    "searchResultsData": {
      "0": {
        "id": 45383312,
        "title": "Inspirational Piano Arpeggios (Aspire)",
        "artist_username": "marcozannone",
        "artist_url": "https://www.pond5.com/ru/artist/marcozannone",
        "sound_bpm": 119,
        "duration_ms": 156000,
        "price_low_usd": 17,
        "price_high_usd": 17,
        "price_currency": { "currency_code": "USD", ... },
        "is_pro": true,
        "is_exclusive": false,
        "is_subscription": true,
        "is_free": false,
        "item_detail_url": "https://www.pond5.com/ru/royalty-free-music/item/45383312-...",
        "ranking": null,
        "formats": [{
          "title": "2:36",
          "description": "/wav",
          "is_default": true,
          "price_usd": 0,
          "item_url": { "m4a": "https://sounds.pond5.com/preview.m4a" },
          "waveform": [...]
        }]
      }
      // ... 47 more items
    }
  }
}
```

> ⚠️ Важно: поле `ranking` всегда возвращает `null`. Реальный рейтинг — это **позиция в массиве** `searchResultsData[0]` = #1 по популярности, и т.д.

---

### 🛠️ ГОТОВЫЙ ЗАПРОС ДЛЯ ЕЖЕНЕДЕЛЬНОГО ОТЧЁТА

**Топ-48 самых популярных треков без фильтров:**
```
GET /ru/index.php?page=ajax_search&bmtext=music&pagenum=1&bm=16&q=&qorg=sr&sb=8&searchLayout=paginated&previewSize=large&perPage=48&currency=USD
```

**Топ-48 по жанру (например Corporate + Inspirational):**
```
GET /ru/index.php?page=ajax_search&bmtext=music&pagenum=1&bm=16&q=genre%3Acorporate+mood%3Ainspirational&qorg=sr&sb=8&searchLayout=paginated&previewSize=large&perPage=48&currency=USD
```

---

### 📊 ТЕКУЩАЯ СТАТИСТИКА (топ-48 популярных)

- Всего треков в каталоге: **2 886 689**
- Среди топ-48: **31 PRO** / 17 без PRO
- Средняя цена: **$12.75**
- Средний BPM: **~118**
- Средняя длительность: **~194 секунды (~3:14)**
- Все 48 доступны по подписке

---

### 🔄 ВТОРОЙ ЭНДПОИНТ (POST, требует авторизации)

```
POST /ru/ajax/item/names
Body: ids[]=ID1&ids[]=ID2&...
```
Возвращает 401 без залогиненного сессионного куки. Нужен для управления коллекцией — для отчётов не нужен.

---

### 📝 ПЛАН СКРИПТА

Для еженедельного автоматического отчёта нужно сделать следующее:

1. **Каждую неделю** — GET запрос с `sb=8` (популярное), страницы 1–N
2. Парсить `searchResultsData` → извлекать `id`, `title`, `artist_username`, `price_low_usd`, `sound_bpm`, `duration_ms`, `is_pro`, `item_detail_url`
3. Сохранять snapshot с датой → сравнивать с прошлой неделей (новые в топе, выбывшие, изменение цены)
4. Разбивать по жанрам и настроениям — делать запрос для каждого жанра отдельно
5. Формировать CSV/JSON отчёт для композиторов

Когда будешь делать скрипт — основной URL готов, всё параметризировано и работает без авторизации.
