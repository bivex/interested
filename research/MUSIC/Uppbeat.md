## Uppbeat API Analysis — Full Summary

---

### 🏗️ Architecture Overview

Uppbeat uses a **Typesense** (open-source search engine) as the primary music search backend, exposed via a public API key. The main app is a **Next.js SSR** app with React Query for data fetching. There is also a `prod-api.uppbeat.io` for authenticated/user-specific data.

| Layer | Technology |
|---|---|
| Search Engine | **Typesense** (hosted) |
| Frontend | Next.js + React Query |
| CDN (audio/images) | `cdn.uppbeat.io`, `api-v2-cdn.uppbeat.io` |
| User/Auth API | `prod-api.uppbeat.io` |
| Static Assets | `fastly-f.uppbeat.io` |

---

### 🔑 Primary Search Endpoint

```
POST https://3feynu8vjgbqkl27p.a1.typesense.net/multi_search
  ?use_cache=true
  &x-typesense-api-key=MqZdBn4VL8k7IqhuM1OSNuBxmU0isNLk

Content-Type: application/json
```

**No auth required** — the Typesense API key is a public read-only key embedded in the frontend.

---

### 📦 Request Body Structure

```json
{
  "searches": [
    {
      "q": "*",
      "query_by": "name, keywords, contributor_name, mood, genre, theme",
      "query_by_weights": "name:2, mood:3, genre:3, theme:3, keywords:2, contributor_name:1",
      "collection": "tracks.v3",
      "per_page": 16,
      "filter_by": "is_premium:true",
      "sort_by": "premium_sort_score_v1:desc",
      "exhaustive_search": false,
      "drop_tokens_threshold": 0,
      "num_typos": 0,
      "page": 1
    },
    {
      "q": "*",
      "query_by": "name, keywords, contributor_name, mood, genre, theme",
      "query_by_weights": "name:2, mood:3, genre:3, theme:3, keywords:2, contributor_name:1",
      "collection": "tracks.v3",
      "per_page": 24,
      "offset": 0,
      "filter_by": "is_premium:false",
      "sort_by": "free_sort_score_v1:desc",
      "exhaustive_search": false,
      "drop_tokens_threshold": 0,
      "num_typos": 0,
      "page": 1
    }
  ]
}
```

The app always sends **2 searches simultaneously** — one for premium tracks and one for free tracks.

---

### 🔃 Sort Options (sort_by field)

| UI Label | `sort_by` value | Meaning |
|---|---|---|
| **Relevance** (default) | `premium_sort_score_v1:desc` | Proprietary popularity score (rolling weighted) |
| **Latest** | `set_live:desc` | Newest tracks first (Unix timestamp) |
| **Undiscovered** | `free_decay_plays:asc` | Least-played tracks first |

Additionally discovered score variants (all sortable):

| Field | Description |
|---|---|
| `premium_sort_score_v1` | Main score (appears ~7-day weighted) |
| `premium_sort_score_v2` through `v5` | Alternate time windows (shorter/longer periods) |
| `free_sort_score_v1` through `v5` | Same for free tracks |
| `premium_track_mean` | Mean score for premium |
| `free_track_mean` | Mean score for free |

For **Top Downloads Today** (Trending page): the "is_trending" boolean flag is set server-side; the UI shows `is_trending:true` tracks (60 currently flagged). The actual daily ranking is computed server-side via `prod-api.uppbeat.io` carousels endpoint (requires auth).

---

### 🎛️ Filter Parameters (filter_by)

All filters chain with ` && ` (Typesense syntax):

```
filter_by: "mood:Happy && genre:Electronic && vocal:Instrumental && energy:Energetic && version_length:<=120 && is_premium:true"
```

| Filter | Parameter | Example Values |
|---|---|---|
| Mood | `mood:VALUE` | `mood:Happy`, `mood:Calm`, `mood:Dark` |
| Genre | `genre:VALUE` | `genre:Electronic`, `genre:Hip Hop`, `genre:Cinematic` |
| Theme | `theme:VALUE` | `theme:Vlog`, `theme:Travel`, `theme:Corporate` |
| Vocal type | `vocal:VALUE` | `vocal:Instrumental`, `vocal:Lyrics: Male` |
| Energy | `energy:VALUE` | `energy:Energetic`, `energy:Moderate`, `energy:Calm` |
| Duration (sec) | `version_length:<=N` | `<=60`, `<=120`, `>=180`, `>=240` |
| BPM range | `tempo:>=N && tempo:<=M` | `tempo:>=120 && tempo:<=140` |
| Premium only | `is_premium:true` | — |
| Free only | `is_premium:false` | — |
| Trending | `is_trending:true` | 60 currently flagged |
| Popular tab | `is_alternative:false` | — |
| Alternative tab | `is_alternative:true` | — |

---

### 🏷️ All Available Filter Values

**Moods** (25 total, with track counts):
Happy(4861), Uplifting(4677), Calm(3943), Sad(3025), Dark(2975), Dramatic(2930), Chill(1846), Upbeat(1584), Stylish(1508), Hopeful(1380), Scary(1243), Relaxing(1194), Emotional(1194), Epic(1044), Funny(864), Cute(789), Intense(623), Romantic(525), Inspirational(396), Motivational(329), Creepy(321), Suspense(296), Sneaky(243), Aesthetic(84), Patriotic(18)

**Genres** (29 total):
Electronic(5072), Beats(3309), Percussion(3191), Cinematic(3041), Ambient(2256), Indie(1764), Pop(1685), Classical(1636), Chillhop(1611), Hip Hop(1566), Lofi(1492), Acoustic(1488), Folk(1048), Dance(972), Rock(948), Trap(813), Jazz(650), House(476), Funk(398), Country(340), Edm(296), Latin(277), Synthwave(219), Dubstep(204), Rap(140), Phonk(108), Techno(98), Metal(56), Drill(56)

**Themes** (33 total):
Vlog(6287), Travel(6255), Aerial(5301), Documentary(4092), Product Review(3112), Technology(2458), Timelapse(2282), Sci-Fi(1341), Workout(1299), Love(1199), Kids(1189), Retro(1161), Action(1135), Education(1044), Wedding(820), Fantasy(723), Commercial(646), Corporate(642), Space(489), Game(472), Horror(460), Vintage(417), Spiritual(374), Sports(369), Meditation(353), Podcast(332), Trailer(308), Battle(208), Western(188), Cooking(73), Fitness(68), News(49), Christian(47)

**Energy levels** (6): Moderate(5494), Energetic(3337), Calm(1937), Intense(769), Very Calm(558), Growing(331)

**Vocals** (6): Instrumental(7985), Vocal Elements(3504), Lyrics: Male(457), Choir(283), Lyrics: Female(160), Lyrics: Duet(34)

**Duration presets**: `<1 min` (<=60s), `<2 min` (<=120s), `3+ min` (>=180s), `4+ min` (>=240s)

---

### 📄 Response Structure (per hit document)

```json
{
  "asset_type": "track",
  "name": "On Vacation",
  "track_slug": "on-vacation",
  "track_id": "9813",
  "track_version_id": 33794,
  "contributor_name": "Matrika",
  "contributor_slug": "matrika",
  "contributor_image": "https://cdn.uppbeat.io/...",
  "genre": ["Chillhop", "Lofi Beats"],
  "mood": ["Chill", "Calm"],
  "theme": ["Vlog", "Travel"],
  "energy": "Moderate",
  "vocal": "Instrumental",
  "tempo": 90,
  "version_length": 154,
  "is_premium": false,
  "is_alternative": false,
  "is_trending": true,
  "is_explicit": 0,
  "set_live": 1773100800,
  "keywords": ["urban", "hip-hop", ...],
  "featured_tags": [{"name": "Boom Bap", "slug": "/music/category/..."}],
  "styles_high_weight": ["Nyc Vibe", "Vlog"],
  "styles_medium_weight": ["Stylish Beats", "Hip-Hop"],
  "styles_low_weight": ["Chillhop", "Gloss & Glam"],
  
  // Popularity metrics
  "premium_sort_score_v1": 0.474,
  "premium_sort_score_v2": 0.449,
  "premium_sort_score_v3": 0.493,
  "premium_sort_score_v4": 0.432,
  "premium_sort_score_v5": 0.518,
  "premium_total_downloads": 66,
  "premium_total_plays": 103,
  "premium_decay_downloads": 57.46,
  "premium_decay_plays": 89.61,
  "premium_track_mean": 0.349,
  "free_sort_score_v1": 0.170,
  "free_sort_score_v2": 0.162,
  "free_total_downloads": 26,
  "free_total_plays": 121,
  "free_decay_downloads": 20.96,
  "free_decay_plays": 95.86,
  
  // Audio/preview
  "version_preview_uri": "https://cdn.uppbeat.io/audio-files/.../STREAMING-....mp3"
}
```

---

### 🌐 Auxiliary Endpoints

| Endpoint | Purpose |
|---|---|
| `GET https://api-v2-cdn.uppbeat.io/api/v1/track/{trackId}/version/{versionId}/waveform` | Waveform data for player |
| `GET https://uppbeat.io/_next/data/{buildId}/browse/trending.json` | SSR trending page data (includes top downloads) |
| `GET https://prod-api.uppbeat.io/api/page/user_metadata` | Auth-required: user downloads, favourites, trending flags |
| `GET https://cdn.uppbeat.io/audio-files/.../STREAMING-{slug}-{artist}-main-version-{versionId}.mp3` | Streaming audio (public, no auth) |

**Track page URL pattern:** `https://uppbeat.io/track/{contributor_slug}/{track_slug}`

---

### 🔍 URL → Typesense Parameter Mapping

| URL param | Typesense `filter_by` |
|---|---|
| `?sort=latest` | `sort_by: "set_live:desc"` |
| `?sort=undiscovered` | `sort_by: "free_decay_plays:asc"` |
| `?sort=` (default) | `sort_by: "premium_sort_score_v1:desc"` |
| `?filter_by=mood:Happy` | `filter_by: "mood:Happy"` |
| `?filter_by=genre:Electronic` | `filter_by: "genre:Electronic"` |
| `?filter_by=vocal:Instrumental` | `filter_by: "vocal:Instrumental"` |
| `?filter_by=energy:Energetic` | `filter_by: "energy:Energetic"` |
| `?filter_by=version_length:<=120` | `filter_by: "version_length:<=120"` |
| `?search=epic` | `q: "epic"` in Typesense query |
| Popular tab | `is_alternative:false` |
| Alternative tab | `is_alternative:true` |

---

### 📊 Today's Top Downloads (from Trending page)

**Premium Top 5:**
1. "Groov Moov" by Flow State — BPM 99, Electronic/Beats/Pop, Happy/Stylish
2. "Boardwalk Breeze" by SENSHO — BPM 91, Chillhop/Lofi, Calm/Uplifting
3. "Featherlight" by Sky Toes — BPM 83, Folk/Cinematic, Hopeful/Romantic
4. "Mirrorball Magic" by Floor Model — BPM 114, Funk/Dance/Electronic, Upbeat/Happy
5. "Moonshine" by Prigida — BPM 76, Beats/Lofi/Chillhop, Calm/Happy

**Free Top 5:**
1. "Let Good Times Roll" by RA — BPM 110, Funk/Pop, Energetic
2. "Go Big Or Go Home" by Otto.mp3 — BPM 160, Chillhop/Trap/Beats
3. "Golden Age" by Walz — BPM 89, Beats/Lofi/Chillhop
4. "Groove Sauce" by Stan Town — BPM 120, Funk
5. "The Cleaner" by Night Drift — BPM 88, Jazz/Lofi/Chillhop

---

### 🔑 Key Script Params (for weekly automation)

```python
TYPESENSE_HOST = "3feynu8vjgbqkl27p.a1.typesense.net"
TYPESENSE_API_KEY = "MqZdBn4VL8k7IqhuMKOSNuBxmU0isNLk"  # public read-only
COLLECTION = "tracks.v3"

# Most popular (Relevance)
sort_popular_premium = "premium_sort_score_v1:desc"
sort_popular_free = "free_sort_score_v1:desc"

# Trending (today)
filter_trending = "is_trending:true"

# Auth required for actual daily download rankings
# prod-api.uppbeat.io/api/carousels/10/maxslide/recent/download
# (returns [] without session cookie)
```

---

### ⚠️ Auth Notes

- **Typesense search**: ✅ No auth needed (public API key)
- **Waveform data**: ✅ No auth needed
- **Audio streaming MP3**: ✅ No auth needed (CDN public)
- **Actual download ranking data** (`/api/carousels/...`): ❌ Requires session cookie
- **Trending `is_trending` flag**: Computed server-side, exposed via Typesense field (no auth needed to read it)

---

### 📊 Platform Comparison Table (All 4 platforms)

| Feature | Pond5 | Epidemic Sound | Artlist | **Uppbeat** |
|---|---|---|---|---|
| Protocol | REST GET | REST GET | GraphQL POST | **Typesense POST** |
| Auth for popular data | None | Session cookie | Session cookie | **None (public key)** |
| Popular sort | `sb=8` | `sort=neutral-pop28` | `songSortType=TOP_DOWNLOADS` | **`premium_sort_score_v1:desc`** |
| BPM filter | `bpmlt`, `bpmgt`, `bpmbetween` | URL param `bpm` | `bpmRange` in GraphQL | **`tempo:>=N && tempo:<=M`** |
| Popularity periods | — | 7/28/91 days, neutral | Staff Picks / Top Downloads | **v1-v5 score variants** |
| Track count | Large | ~35k | ~40k | **~12,427** |
| Price info | ✅ Yes | Subscription only | Subscription only | **Free vs Premium flag** |
| Trending flag | No | No | No | **✅ `is_trending` boolean** |
| Decay metrics exposed | No | No | No | **✅ decay_downloads, decay_plays** |
