Хорошо, подводим итог по тому, что удалось выяснить:

---

## Результаты анализа бэкенда keywordtool.io

### Найденные API endpoints (из Performance API)

| Endpoint | Метод | Размер ответа | Статус |
|---|---|---|---|
| `GET /search/keywords/google/keywords` | XHR | 13 KB | требует сессию |
| `GET /search/keywords/google/metrics?signature=...` | XHR | 9.6 KB | требует сессию |
| `GET /search/keywords/google/result/{id}?...` | fetch | ~22 KB × 4 | требует сессию + подпись |
| `GET /api/search/keywords/google/result/{id}` | fetch | 419 B | 404 (не существует) |
| `GET /search/keywords/google/locations` | XHR | 2.1 KB | ок |

---

### Структура ответа бэкенда (из анализа app.js)

**Основной ответ (`/search/keywords/google/result/{id}` и keywords endpoint):**
```json
{
  "keywords": [...],           ← массив ключевых слов
  "summaries": {...},          ← сводные данные
  "all_keywords": [...],
  "has_error": bool,
  "has_all_error": bool,
  "has_more": bool,
  "breakdown_url": "...",
  "device_breakdown_url": "...",
  "keywords_payload": "...",
  "metrics_url": "...",
  "scrape_urls": [...],
  "used_search_limit_daily": ...,
  "validate_error": ...,
  "hide_exclude_seed_keyword": bool,
  "title": "..."
}
```

**Поля каждого объекта в `keywords[]`:**
`keyword`, `keyword_id`, `keyword_source`, `id`, `search_volume`, `average_cpc`, `competition`, `low_top_page_bid`, `high_top_page_bid`, `search_volume_trend_data`, `metric`, `location`, `country_code`, `category_code`, `language_code`, `icon`

**Поля `summaries`:**
`search_volume`, `search_volume_format`, `search_volume_trend`, `search_volume_trend_data`, `search_volume_trend_labels`, `search_volume_trend_format`, `search_volume_trend_title`, `average_cpc_format`, `low_top_page_bid`, `low_top_page_bid_format`, `high_top_page_bid`, `high_top_page_bid_format`, `competition_format`, `competition_class`, `total_keywords`, `search_total_keywords`, `search_total_keywords_format`, `total_posts`, `total_posts_format`, `has_top_page_bid`, `has_competition_text`, `hide`

---

### Вывод по вопросу "отдаёт ли бэк все поля"

**Бэкенд всё возвращает**, но значения метрик (`search_volume`, `average_cpc`, `competition`, `top_page_bid`) **маскируются на фронтенде** (`88,888`, `8.88`) — это логика Vue-компонента для неавторизованных/бесплатных пользователей (`user-is-paid: false`). Сами поля в ответе присутствуют, но реальные значения скрыты за paywall. Без платной подписки проверить реальные данные в полях не удалось.
