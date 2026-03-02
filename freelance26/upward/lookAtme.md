## Да, категорию задавать можно! Вот полная картина:

---

### Как работает фильтрация по категории

Фильтр `categoryId` живёт в Vuex store `filters.applied`. `getJobsWithFilters` **автоматически читает** применённые фильтры из стора при вызове без payload.

**Нужно просто два шага:**

```javascript
// 1. Установить категорию
store.dispatch('filters/setAppliedValue', {
  key: 'categoryId',
  value: ['531770282580668418']  // Web, Mobile & Software Dev
});

// 2. Перезагрузить список
store.dispatch('feedMostRecent/resetJobs');
store.dispatch('feedMostRecent/getJobsWithFilters');
```

---

### Все 12 категорий с ID

| Категория | ID |
|---|---|
| **Web, Mobile & Software Dev** | `531770282580668418` |
| Design & Creative | `531770282580668421` |
| Sales & Marketing | `531770282580668422` |
| Writing | `531770282580668423` |
| Data Science & Analytics | `531770282580668420` |
| IT & Networking | `531770282580668419` |
| Admin Support | `531770282580668416` |
| Customer Service | `531770282580668417` |
| Accounting & Consulting | `531770282584862721` |
| Engineering & Architecture | `531770282584862722` |
| Legal | `531770282584862723` |
| Translation | `531770282584862720` |

Есть ещё **64 подкатегории** — их список экспортирован в `upwork_categories.csv` (76 строк).

---

### Полный скрипт (копипаст в DevTools)

```javascript
// === КОНФИГ ===
const CATEGORY_ID = '531770282580668418'; // Web, Mobile & Software Dev (или '' для всех)
const TARGET_COUNT = 100;

// === ПАРСЕР ===
async function parseUpworkJobs(categoryId = '', targetCount = 100) {
  const store = window.$nuxt.$store;
  
  // Устанавливаем категорию
  await store.dispatch('filters/setAppliedValue', {
    key: 'categoryId',
    value: categoryId ? [categoryId] : []
  });
  
  // Сбрасываем и грузим первую порцию
  await store.dispatch('feedMostRecent/resetJobs');
  await store.dispatch('feedMostRecent/getJobsWithFilters');
  await new Promise(r => setTimeout(r, 800));
  
  // Догружаем батчами
  while (store.state.feedMostRecent.jobs.length < targetCount) {
    const state = store.state.feedMostRecent;
    const offset = state.jobs.length;
    if (!state.paging?.resultSetTs) break;

    await store.dispatch('feedMostRecent/getJobsWithFilters', {
      params: {
        max_result_set_ts: state.paging.resultSetTs,
        paging: `${offset};10`
      }
    });
    
    await new Promise(r => setTimeout(r, 600));
    if (store.state.feedMostRecent.jobs.length <= offset) break;
  }
  
  // Нормализуем данные
  const jobs = store.state.feedMostRecent.jobs.map(j => ({
    id: j.id,
    title: j.title,
    description: j.description?.substring(0, 400),
    type: j.type === 1 ? 'Fixed' : 'Hourly',
    budget: j.amount?.amount || null,
    hourlyMin: j.hourlyBudget?.min || null,
    hourlyMax: j.hourlyBudget?.max || null,
    duration: j.durationLabel,
    publishedOn: j.publishedOn,
    skills: j.attrs?.map(a => a.prettyName).join(', '),
    proposals: j.proposalsTier,
    connects: j.connectPrice,
    clientCountry: j.client?.location?.country,
    clientSpent: j.client?.totalSpent,
    clientHires: j.client?.totalHires,
    clientRating: j.client?.totalFeedback,
    paymentVerified: j.client?.paymentVerificationStatus === 1,
    url: `https://www.upwork.com/jobs/~0${j.ciphertext?.replace('~', '')}`
  }));
  
  // Экспорт CSV
  const headers = Object.keys(jobs[0]);
  const esc = v => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g,'""')}"` : s; };
  const csv = [headers.join(','), ...jobs.map(j => headers.map(h => esc(j[h])).join(','))].join('\n');
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = `upwork_jobs_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  // Экспорт JSON
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(new Blob([JSON.stringify(jobs,null,2)], {type:'application/json'}));
  a2.download = `upwork_jobs_${new Date().toISOString().split('T')[0]}.json`;
  a2.click();
  
  const total = store.state.feedMostRecent.paging?.total;
  console.log(`✅ Loaded ${jobs.length}/${total} jobs`);
  return jobs;
}

parseUpworkJobs(CATEGORY_ID, TARGET_COUNT);
```

**Сейчас скачано:** `upwork_webdev_jobs.csv`, `upwork_webdev_jobs.json` (20 работ из Web Dev, total доступно: 1652) + `upwork_categories.csv` (76 категорий с ID).
