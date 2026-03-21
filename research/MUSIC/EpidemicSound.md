## 🎵 Полный анализ Epidemic Sound API — сводка

---

### 🔑 ГЛАВНЫЙ ЭНДПОИНТ (поиск треков)

```
GET https://www.epidemicsound.com/json/search/tracks/
```

**Без авторизации не работает** — нужен активный сессионный cookie (как у залогиненного пользователя, что есть на этом аккаунте).

---

### 📋 ПАРАМЕТРЫ ЗАПРОСА

| Параметр | Тип | Описание | Пример |
|---|---|---|---|
| `sort` | string | **Тип сортировки** | см. ниже |
| `order` | string | Направление | `desc` / `asc` |
| `page` | int | Номер страницы | `1`, `2`, ... `167` |
| `term` | string | Поисковый текст | `piano chill` |
| `genres` | string | Жанр (повторять для мульти) | `genres=pop&genres=hip-hop` |
| `moods` | string | Настроение | `moods=happy&moods=dreamy` |
| `vocals` | bool | Вокал | `true` / `false` |
| `energy` | string | Уровень энергии | `low`, `medium`, `high` |
| `bpmMin` | int | Минимальный BPM | `80` |
| `bpmMax` | int | Максимальный BPM | `130` |
| `lengthMin` | int | Мин. длина (секунды) | `60` |
| `lengthMax` | int | Макс. длина (секунды) | `240` |
| `musicalKey` | string | Тональность | `c-major`, `a-minor` |
| `instruments` | string | Инструмент | `piano`, `electric-guitar` |
| `segment_types` | string | Доп. метаданные | см. ниже |

---

### 🔢 ЗНАЧЕНИЯ СОРТИРОВКИ (`sort`) — КЛЮЧЕВОЕ ОТКРЫТИЕ

```
relevance      → По релевантности (поиск)
date           → По дате добавления (новые)
title          → По названию (A-Z)
genre          → По жанру
mood           → По настроению
bpm            → По BPM
energy         → По уровню энергии
length         → По длительности

pop7           → Популярность за 7 дней
pop28          → Популярность за 28 дней  ← ИСПОЛЬЗУЙ ДЛЯ НЕДЕЛЬНОГО ОТЧЁТА
pop91          → Популярность за 91 день (квартал)

neutral-pop7   → Популярность за 7 дней (нейтральный алгоритм, без буст новинок)
neutral-pop28  → То же за 28 дней  ← ИСПОЛЬЗУЕТСЯ В UI ПО УМОЛЧАНИЮ
neutral-pop91  → То же за 91 день

trend          → Тренды (текущий момент)
```

> Разница **pop** vs **neutral-pop**: `pop` буcтит новые треки, `neutral-pop` — чистая популярность без искусственного подъёма.

---

### 🎛️ ВСЕ ЖАНРЫ (с количеством треков)

```
cinematic:11507   pop:9157          hip-hop:6924
acoustic:6494     ambient:5075      electronic:4759
drama:4277        classical:3703    house:3698
beats:3634        rock:3230         2010s:3163
indie-pop:2215    jazz:2094         beautiful:1941
latin:1882        funk:935          drone:1697
trap:1696         action:1688       adventure:1669
solo-piano:1574   contemporary-classical:1414
folk:1383         electro:1290      country:1198
suspense:1245     children-music:1218 r-and-b:1168
soft-house:1080   build:1014        deep-house:966
comedy:728        mystery:765       special-occasions:876
solo-guitar:802   christmas:754     2000s:662
2020s:656         1960s:531
```

---

### 😊 ВСЕ НАСТРОЕНИЯ (с количеством)

```
dreamy:13116      hopeful:12682     happy:11447
laid-back:9758    restless:8219     dark:5482
sentimental:5213  peaceful:4239     romantic:3664
relaxing:3450     epic:2962         mysterious:2898
floating:2397     eccentric:2305    sad:2282
suspense:2233     quirky:1812       busy-frantic:1770
angry:1768        euphoric:1655
```

---

### 📦 СТРУКТУРА ОТВЕТА

```json
{
  "entities": {
    "tracks": {
      "277437": {
        "id": 277437,
        "kosmosId": "386e7d4b-7b08-4a2a-8e34-5a4c38253689",
        "title": "Impossible Theory",
        "creatives": {
          "mainArtists": [{"name": "Rachel Sandy", "slug": "rachel-sandy-2"}],
          "composers":   [{"name": "Rachel Sandy", "slug": "rachel-sandy-2"}],
          "producers":   [{"name": "Rachel Sandy", "slug": "rachel-sandy-2"}],
          "featuredArtists": []
        },
        "bpm": 149,
        "length": 156,           // секунды
        "durationMs": 156998,
        "energyLevel": "medium",
        "hasVocals": false,
        "isExplicit": false,
        "releaseDate": "2025-11-12T12:50:35",
        "publicSlug": "sYXvsRclhv",  // для URL трека
        "genres": [{"displayTag": "Orchestral", "slug": "orchestral", "fatherTag": "Classical"}],
        "moods": [{"displayTag": "Hopeful", "slug": "hopeful"}],
        "metadataTags": [...],
        "seriesId": null,
        "imageUrl": "https://cdn.epidemicsound.com/curation-assets/...",
        "segmentGroups": {
          "0": { "type": "music-structure", "segments": [...] },
          "1": { "type": "predicted-popular-15sec", "segments": [
            { "startTime": 21, "duration": 15, "value": "14.95" }
          ]}
        }
      }
    }
  },
  "meta": {
    "term": "",
    "totalHits": 10000,   // лимит Elasticsearch, реальных треков ~57600+
    "totalPages": 167,
    "hits": [              // УПОРЯДОЧЕННЫЙ список ID (позиция = рейтинг)
      { "trackId": 277437, "stemType": "full" },
      ...
    ],
    "aggregations": {      // фасеты для фильтров с количествами
      "genres": [...],
      "moods": [...],
      "energy": [...],
      "bpm": {"min": 0, "max": 320},
      "length": {"min": 4, "max": 1806},
      "vocals": [...],
      "musicalKeys": [...],
      "featuredInstrumentSlugs": [...]
    }
  }
}
```

---

### 🎧 ВТОРОЙ ЭНДПОИНТ — детали трека с аудио

```
POST https://www.epidemicsound.com/api/music/tracks/kosmos/
Content-Type: application/json
Body: { "kosmos_ids": ["386e7d4b-...", "3cde129e-..."] }
```

Возвращает то же что entities.tracks плюс **URL аудио файлов:**
```json
"stems": {
  "full": {
    "stemType": "full",
    "lqMp3Url": "https://audiocdn.epidemicsound.com/lqmp3/01KK0ZQGB6W5HG0NX7GQ14MCNB.mp3",
    "waveformUrl": "https://audiocdn.epidemicsound.com/waveform/01K5YAPZXBCFHFA54ZP9WP87E8.json"
  },
  "bass": {...}, "drums": {...}, "instruments": {...}, "melody": {...}
}
```

---

### 🔄 ТРЕТИЙ ЭНДПОИНТ — кураторские плейлисты

```
GET /api/music/curated-playlists/categories/?keys=corporate&keys=cinematic&keys=podcast
```

Возвращает ручные подборки редакции с описаниями.

---

### 🛠️ ГОТОВЫЙ ЗАПРОС ДЛЯ ЕЖЕНЕДЕЛЬНОГО ОТЧЁТА

**Топ-60 самых популярных за 28 дней:**
```
GET /json/search/tracks/?order=desc&page=1&sort=neutral-pop28&term=&segment_types=predicted-popular-15sec
```

**Топ по жанру + настроению:**
```
GET /json/search/tracks/?order=desc&page=1&sort=neutral-pop28&term=&genres=cinematic&moods=epic
```

**Тренды этой недели (7 дней):**
```
GET /json/search/tracks/?order=desc&page=1&sort=pop7&term=
```

---

### 📊 СРАВНЕНИЕ Pond5 vs Epidemic Sound

| Параметр | Pond5 | Epidemic Sound |
|---|---|---|
| Формат API | GET с query-string | GET с query-string |
| Авторизация | Не требуется | Требует сессию (cookie) |
| Сортировок популярности | 1 (`sb=8`) | 6 (pop7/28/91 + neutral) |
| Треков за запрос | 48/96/120 | 60 |
| Рейтинг в ответе | Порядок в массиве | Порядок в `meta.hits` |
| Ценообразование | $$ за трек | Только подписка |
| Сегментация трека | Нет | Да — структура + популярный 15-сек |
| Стемы | Нет | Да (bass, drums, melody, instruments) |
| Всего треков в каталоге | 2.8M | ~57K+ (нишевый, curated) |

---

### 💡 Ключевой бонус для композиторов

`predicted-popular-15sec` — Epidemic Sound предсказывает **самый цепляющий 15-секундный фрагмент** трека. Это очень ценная метрика: она показывает куда зритель возвращается чаще всего, что фактически = индикатор "хука" и коммерческого потенциала композиции.
