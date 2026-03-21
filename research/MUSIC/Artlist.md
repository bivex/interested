## 🎵 Полный анализ Artlist API — сводка

---

### ⚠️ КЛЮЧЕВОЕ ОТЛИЧИЕ ОТ POND5 И EPIDEMIC SOUND

Artlist использует **GraphQL** через REST-like endpoint с авторизацией через сессионную cookie (`userSession`). Прямые запросы с других доменов блокируются CORS, но внутри сессии браузера всё работает через XHR.

---

### 🔑 GRAPHQL ЭНДПОИНТЫ

| Эндпоинт | Версия | Назначение |
|---|---|---|
| `https://search-api.artlist.io/v1/graphql` | v1 | `RootCategories`, `trendingSearchTerm`, `Catalog` |
| `https://search-api.artlist.io/v2/graphql` | v2 | **`SongList`** (основной поиск), `AlbumsBySongSearch` |
| `https://api.artlist.io/v1/asset/by-ids` | REST | Детали ассетов по ID |

---

### 🎯 ОСНОВНОЙ GRAPHQL ЗАПРОС

```graphql
query SongList(
  $page: Int!,
  $songSortType: SongSortType!,
  $take: Int!,
  $vocalType: VocalType!,
  $bpmMax: Int,
  $bpmMin: Int,
  $durationMax: Int,
  $durationMin: Int,
  $excludedCategoryIds: [Int],
  $categoryIds: [Int],
  $searchTerm: String,
  $isWithStemsOnly: Boolean
) {
  songList(...) {
    songs {
      songId
      songName
      nameForURL
      artistId
      artistName
      primaryArtists
      featuredArtists
      albumId
      albumName
      albumNameForURL
      albumThumbFilePath
      albumImageFilePath
      duration         # в секундах
      durationTime     # строка "MM:SS"
      explicit
      isOriginal
      isNew
      isPreRelease
      officialReleaseDate
      lyrics
      assetTypeId
      sitePlayableFilePath    # URL для прослушивания
      waveSurferFilePath      # URL waveform JSON
      numberOfStems
      genreCategories {
        id
        name
        parentName
      }
      hook30Start      # ← старт самого цепляющего 30-сек фрагмента!
      hook30End
      versions { ... }  # альтернативные версии трека
    }
    totalResults
  }
}
```

---

### 🔢 СОРТИРОВКА (`songSortType`)

| Значение | URL `sortId` | Описание |
|---|---|---|
| `STAFF_PICKS` | `sortId=1` | Редакционный выбор (по умолчанию) |
| `TOP_DOWNLOADS` | `sortId=2` | **Топ скачиваний ← ДЛЯ ОТЧЁТОВ** |
| `NEWEST` | `sortId=3` | Самые новые |

> ⚠️ Только 3 опции сортировки — значительно меньше чем у Epidemic Sound (7 вариантов). Нет разбивки по периодам (7/28/91 дней).

---

### 🎛️ ПАРАМЕТРЫ ФИЛЬТРАЦИИ

**Вокал** (`vocalType: VocalType!`):

| URL `vocalId` | GraphQL значение |
|---|---|
| — (default) | `VOCAL_AND_INSTRUMENTS` |
| `vocalId=1` | `VOCALS` |
| `vocalId=2` | `INSTRUMENTAL` |
| `vocalId=3` | `FEMALE_VOCALS` |
| `vocalId=4` | `MALE_VOCALS` |
| `vocalId=5` | `DUET` |
| `vocalId=6` | `GROUP` |
| `vocalId=7` | `ACAPELLA` |

**BPM** (в ударах в минуту):

| Пресет | `bpmMin` | `bpmMax` |
|---|---|---|
| Slow | 20 | 70 |
| Slow-Med | 70 | 90 |
| Medium | 90 | 110 |
| Med-Fast | 110 | 130 |
| Fast | 130 | 200 |

**Длительность** (в **секундах**):

| Пресет UI | `durationMin` | `durationMax` |
|---|---|---|
| < 30 sec | 0 | 30 |
| < 1 min | 0 | 60 |
| < 1.5 min | 0 | 90 |
| 3+ min | 180 | 420 |
| 4+ min | 240 | 420 |

**Стемы:** `isWithStemsOnly: true` (URL: `stemsOnly=true`)

---

### 🗂️ ЖАНРЫ И НАСТРОЕНИЯ (через `categoryIds`)

Жанры и настроения передаются **одним списком** через `categoryIds: [Int]`. Это числовые ID, и Genres/Moods оба используют один и тот же параметр.

| Жанр | ID | Настроение | ID |
|---|---|---|---|
| Cinematic | 62 | Happy | 7 |
| Acoustic | 65 | — | — |
| Corporate | 72 | — | — |
| Classical | ? | Uplifting, Epic, Powerful... | ? |

Все доступные жанры: Acoustic, Ambient, Blues, Children, Cinematic, Classical, Corporate, Country, Electronic, Fantasy, Folk, Funk, Hip Hop, Holiday, Indie, Jazz, Latin, Lofi & Chill Beats, Lounge, Pop, Reggae, Retro, Rock, Singer-Songwriter, Soul & RnB, World, Worship

Все настроения: Uplifting, Epic, Powerful, Exciting, Happy, Funny, Carefree, Hopeful, Love, Playful, Groovy, Sexy, Peaceful, Mysterious, Serious, Dramatic, Angry, Tense, Sad, Scary, Dark

> 💡 **Для скрипта:** чтобы получить все ID — нужно пробежать по каждому жанру и настроению через URL и записать ID из `includedIds=N`

---

### 📦 СТРУКТУРА ОТВЕТА (ключевые поля)

```json
{
  "data": {
    "songList": {
      "totalResults": 12450,
      "songs": [
        {
          "songId": 51820,
          "songName": "The Light Within",
          "artistName": "Ziv Moran",
          "primaryArtists": "Ziv Moran, Light Whale",
          "duration": 205,
          "durationTime": "03:25",
          "albumThumbFilePath": "https://cdn.artlist.io/...",
          "sitePlayableFilePath": "https://audio.artlist.io/...",
          "waveSurferFilePath": "https://cdn.artlist.io/.../waveform.json",
          "numberOfStems": 4,
          "isNew": false,
          "isPreRelease": false,
          "explicit": false,
          "hook30Start": 45,
          "hook30End": 75,
          "genreCategories": [
            {"id": 62, "name": "Cinematic", "parentName": "Genre"},
            {"id": 7, "name": "Happy", "parentName": "Mood"}
          ],
          "versions": [...]
        }
      ]
    }
  }
}
```

---

### 🔄 PAGINATION

```json
{
  "page": 1,        // номер страницы
  "take": 20        // треков на страницу (можно увеличить)
}
```

---

### 💡 УНИКАЛЬНЫЕ ПОЛЯ ARTLIST

**`hook30Start` / `hook30End`** — временные метки самого цепляющего 30-секундного фрагмента трека (аналог `predicted-popular-15sec` в Epidemic Sound). Очень ценная метрика для анализа структуры хита!

**`versions`** — альтернативные версии трека (short cut, no intro и т.д.)

**`numberOfStems`** — количество стем файлов (бас, барабаны и т.д.)

---

### 📊 СРАВНЕНИЕ ВСЕХ ТРЁХ ПЛАТФОРМ

| Параметр | Pond5 | Epidemic Sound | Artlist |
|---|---|---|---|
| Тип API | REST GET | REST GET | **GraphQL POST** |
| Авторизация | ❌ Не нужна | ✅ Cookie | ✅ Cookie |
| Сортировок популярности | 1 | 6 (7/28/91 дней) | 1 (Top Downloads) |
| Треков за запрос | 48/96/120 | 60 | 20 (настраивается) |
| Жанры в запросе | текст (genre:rock) | query params | **числовые ID** |
| Размер каталога | 2.8M | ~57K | ~150K+ |
| Период популярности | нет данных | 7/28/91 дней | нет данных |
| "Хук" предсказание | ❌ | `predicted-popular-15sec` | `hook30Start/End` |
| Стемы в API | ❌ | ✅ | ✅ (numberOfStems) |
| Цены в API | ✅ | ❌ (подписка) | ❌ (подписка) |
