Вот минимальный скрипт для извлечения категорий — вставить в DevTools Console на странице `upwork.com/nx/find-work/most-recent`:

```javascript
// ============================================================
// UPWORK CATEGORY ID EXTRACTOR
// Вставить в DevTools Console на /nx/find-work/most-recent
// Требуется: открытый модал Filters + раскрытый dropdown категорий
// ============================================================

function extractUpworkCategories() {

  // --- Шаг 1: найти Vue-компонент CategoryDropdownFilter ---
  function findVueComp(name) {
    function walk(vm) {
      if ((vm.$options?.name || '').includes(name)) return vm;
      for (const child of (vm.$children || [])) {
        const f = walk(child);
        if (f) return f;
      }
      return null;
    }
    return walk(window.$nuxt);
  }

  const catComp = findVueComp('CategoryDropdown');

  if (!catComp) {
    console.warn('❌ CategoryDropdownFilter не найден.');
    console.warn('👉 Открой Filters → кликни на "Select Category" dropdown → запусти снова.');
    return null;
  }

  // --- Шаг 2: извлечь категории из computed `categories` ---
  const raw = catComp.categories || [];
  const result = [];

  for (const cat of raw) {
    result.push({
      id:       cat.id,
      name:     cat.preferredLabel,
      parent:   null,
      parentId: null
    });
    for (const sub of (cat.subcategories || [])) {
      result.push({
        id:       sub.id,
        name:     sub.preferredLabel,
        parent:   cat.preferredLabel,
        parentId: cat.id
      });
    }
  }

  // --- Шаг 3: вывод в консоль ---
  console.log(`✅ Найдено ${result.length} категорий (${raw.length} топ-уровневых)\n`);
  console.table(result.filter(c => !c.parent));   // только родительские
  console.log('\nПолный список:');
  console.table(result);

  // --- Шаг 4: экспорт CSV ---
  const csv = [
    'id,name,parent,parentId',
    ...result.map(c =>
      `${c.id},"${c.name}","${c.parent || ''}","${c.parentId || ''}"`
    )
  ].join('\n');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'upwork_categories.csv';
  a.click();

  // --- Шаг 5: сохранить в window для дальнейшего использования ---
  window.UPWORK_CATEGORIES = result;
  console.log('\n💾 Сохранено в window.UPWORK_CATEGORIES');
  console.log('🔑 Пример использования в парсере:');
  console.log('  categoryId: "' + (result.find(c => c.name.includes('Web'))?.id || '') + '"  // Web, Mobile & Software Dev');

  return result;
}

extractUpworkCategories();
```

**Как запустить:**

1. Открой страницу `upwork.com/nx/find-work/most-recent`
2. Нажми кнопку **Filters** → кликни на дропдаун **"Select Category"** (чтобы компонент смонтировался)
3. Вставь и запусти скрипт в DevTools Console
4. Получишь `console.table` со всеми категориями + скачается `upwork_categories.csv`

**Результат (76 строк):**

| ID | Name | Parent |
|---|---|---|
| `531770282580668418` | Web, Mobile & Software Dev | — |
| `531770282580668421` | Design & Creative | — |
| `531770282580668420` | Data Science & Analytics | — |
| `531770282584862722` | Engineering & Architecture | — |
| ... | подкатегории... | родитель |

Данные также сохраняются в `window.UPWORK_CATEGORIES` — удобно передавать напрямую в скрипт парсера.
