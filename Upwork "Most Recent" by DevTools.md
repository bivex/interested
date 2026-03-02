## Результаты исследования — парсинг Upwork "Most Recent" через DevTools

### Что было исследовано и найдено

---

**Архитектура страницы:**
Upwork использует **Nuxt.js (Vue + Vuex)** с GraphQL API. "Load More Jobs" — не простая пагинация, а Vuex action, который вызывает GraphQL endpoint.

---

### Как работает "Load More Jobs"

**Endpoint:**
```
POST https://www.upwork.com/api/graphql/v1?alias=mostRecentRecommendationsFeed
```

**GraphQL Query (найден в bundle):**
```graphql
query MostRecentRecommendationsFeed($request: JobRecommendationsRequest!) {
  mostRecentRecommendationsFeed(request: $request) {
    results {
      id, uid:id, title, ciphertext, description, type, recno,
      freelancersToHire, duration, durationLabel, engagement,
      amount { amount },
      createdOn:createdDateTime, publishedOn:publishedDateTime,
      client { totalHires totalSpent paymentVerificationStatus
        location { country } totalReviews totalFeedback },
      tierText, tier, proposalsTier, enterpriseJob, premium,
      attrs:skills { id, uid:id, prettyName:prefLabel },
      hourlyBudget { type min max }, isApplied,
      annotations { tags }
    },
    paging { total, count, resultSetTs:minTime, maxTime }
  }
}
```

**Механизм пагинации:**
```
params: {
  max_result_set_ts: "1772356497522",  // из state.paging.resultSetTs
  paging: "60;10"                       // "offset;count"
}
```

---

### Скрипт для парсинга (вставить в DevTools Console)

```javascript
async function parseUpworkJobs(targetCount = 200) {
  const store = window.$nuxt.$store;
  
  // Загружаем батчами по 10
  while (store.state.feedMostRecent.jobs.length < targetCount) {
    const state = store.state.feedMostRecent;
    const offset = state.jobs.length;
    
    await store.dispatch('feedMostRecent/getJobsWithFilters', {
      params: {
        max_result_set_ts: state.paging.resultSetTs,
        paging: `${offset};10`
      }
    });
    
    await new Promise(r => setTimeout(r, 600)); // пауза между запросами
    
    console.log(`Loaded: ${store.state.feedMostRecent.jobs.length}/${targetCount}`);
  }
  
  // Нормализуем и экспортируем
  const jobs = store.state.feedMostRecent.jobs.map(j => ({
    id: j.id,
    title: j.title,
    description: j.description,
    type: j.type === 1 ? 'Fixed' : 'Hourly',
    budget: j.amount?.amount || `${j.hourlyBudget?.min}-${j.hourlyBudget?.max}/hr`,
    duration: j.durationLabel,
    publishedOn: j.publishedOn,
    skills: j.attrs?.map(a => a.prettyName).join(', '),
    proposals: j.proposalsTier,
    connects: j.connectPrice,
    clientCountry: j.client?.location?.country,
    clientSpent: j.client?.totalSpent,
    clientRating: j.client?.totalFeedback,
    paymentVerified: j.client?.paymentVerificationStatus === 1,
    url: `https://www.upwork.com/jobs/~0${j.ciphertext?.replace('~','')}`
  }));
  
  // Скачать как CSV
  const headers = Object.keys(jobs[0]);
  const csv = [headers.join(','),
    ...jobs.map(j => headers.map(h => {
      const v = String(j[h] ?? '');
      return v.includes(',') ? `"${v}"` : v;
    }).join(','))
  ].join('\n');
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = `upwork_jobs_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  // Скачать как JSON
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(new Blob([JSON.stringify(jobs,null,2)], {type:'application/json'}));
  a2.download = `upwork_jobs_${new Date().toISOString().split('T')[0]}.json`;
  a2.click();
  
  return `Done! Exported ${jobs.length} jobs`;
}

parseUpworkJobs(200).then(console.log);
```

---

### Что было сделано прямо сейчас

- Загружено и экспортировано **100 работ** (CSV + JSON, ~98KB)
- Файлы уже скачаны в папку Downloads

---

### Ключевые находки

| Параметр | Значение |
|---|---|
| Total jobs available | ~1934-1959 |
| Метод пагинации | cursor + offset: `"offset;count"` |
| Cursor | `resultSetTs` (из paging) |
| Batch size | 10 (можно менять) |
| Auth | cookies `XSRF-TOKEN` + `oauth2_global_js_token` |
| Vuex action | `feedMostRecent/getJobsWithFilters` |

**Важно:** скрипт работает **только в браузере** где открыта страница — использует авторизованную сессию через куки. Для standalone-скрипта нужно извлечь cookies и добавить в заголовки запроса.
