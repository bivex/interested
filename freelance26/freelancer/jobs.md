## Анализ структуры и готовый скрипт

Скрипт уже отработал — скачал **133 проекта iOS Development в 3 запроса**.

---

### Как всё устроено

Страница использует **jQuery DataTables** с server-side пагинацией. Данные подгружаются через:
```
POST /ajax/table/project_contest_datatable.php
```
Параметры запроса хранятся в `window.project_table_cache.lastRequest`, а маппинг колонок — в `window.project_tableColumnIndexes`.

**Ключевые находки:**
- `window.project_table` — объект DataTables API
- `window.project_table_cache.iTotalRecords` → **133** (всего), 50 на страницу = 3 страницы
- `window.project_table_cache.lastRequest` → все параметры фильтрации (skills_chosen=1067, языки, тип проекта)
- `window.mapped_jobs` → словарь skill IDs → названия (`s1067 = "iOS Development"`)
- Пагинация: параметр `iDisplayStart` = 0, 50, 100...

---

### Финальный скрипт для DevTools

```javascript
// Запускать на https://www.freelancer.com/jobs/ios-development/1/
(async () => {
  const cols = window.project_tableColumnIndexes;
  const cache = window.project_table_cache;
  const TOTAL = cache.iTotalRecords;
  const PER_PAGE = 50;
  const PAGES = Math.ceil(TOTAL / PER_PAGE);
  console.log(`Total: ${TOTAL}, Pages: ${PAGES}`);

  const baseParams = {};
  cache.lastRequest.forEach(p => { baseParams[p.name] = p.value; });

  const allRows = [];
  for (let page = 0; page < PAGES; page++) {
    const params = new URLSearchParams();
    Object.entries(baseParams).forEach(([k,v]) => params.append(k, v == null ? '' : String(v)));
    params.set('iDisplayStart', String(page * PER_PAGE));
    params.set('iDisplayLength', String(PER_PAGE));
    params.set('sEcho', String(page + 1));

    const json = await fetch('/ajax/table/project_contest_datatable.php?' + params, 
      {credentials:'include'}).then(r => r.json());
    allRows.push(...(json.aaData || []));
    console.log(`Page ${page+1}/${PAGES}: ${json.aaData?.length} rows`);
    if (page < PAGES - 1) await new Promise(r => setTimeout(r, 500)); // пауза
  }

  // CSV
  const headers = ['id','title','description','type','duration','skills',
    'budget_min_usd','budget_max_usd','avg_bid','bids','posted','deadline',
    'featured','urgent','nda','sealed','guaranteed','fulltime','top',
    'payment_verified','country','url'];

  const rows = [headers, ...allRows.map(row => {
    const skills = (row[cols.jobs]||'').toString().split(',')
      .map(id => window.mapped_jobs?.['s'+id.trim()]?.name||id).filter(Boolean).join('; ');
    const b = row[cols.budget] || {};
    return [
      row[cols.id], row[cols.name],
      (row[cols.description]||'').replace(/&rsquo;/g,"'").replace(/\n/g,' ').slice(0,500),
      row[cols.type]==='c' ? 'contest' : 'project',
      row[cols.duration], skills,
      b.minbudget_usd||'', b.maxbudget_usd||'',
      row[cols.avg], row[cols.bids],
      row[cols.start], row[cols.end],
      +!!row[cols.featured], +!!row[cols.urgent], +!!row[cols.nda],
      +!!row[cols.sealed], +!!row[cols.guaranteed], +!!row[cols.fulltime],
      +!!row[cols.top], row[cols.isPaymentVerified],
      row[cols.project_country]||'',
      row[cols.seo_url] ? 'https://www.freelancer.com'+row[cols.seo_url] : ''
    ];
  })];

  const csv = rows.map(r => r.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'})),
    download: 'freelancer_jobs.csv'
  });
  document.body.appendChild(link); link.click(); link.remove();
  console.log(`✅ Done! ${allRows.length} rows`);
})();
```

---

### Поля в CSV

| Поле | Описание |
|---|---|
| `id` | ID проекта |
| `title` | Название |
| `description` | Описание (до 500 символов) |
| `type` | `project` или `contest` |
| `duration` | `Fixed` / `Hourly` / `Unspecified` |
| `skills` | Навыки через `;` |
| `budget_min/max_usd` | Бюджет в USD |
| `avg_bid` | Средняя ставка |
| `bids` | Количество заявок |
| `posted` / `deadline` | Даты |
| `featured`, `urgent`, `nda`... | Флаги (0/1) |
| `url` | Прямая ссылка на проект |

Для другой категории — просто открой нужную страницу `/jobs/SKILL-NAME/` и запусти тот же скрипт. Параметр `skills_chosen` подхватится автоматически из `cache.lastRequest`.
