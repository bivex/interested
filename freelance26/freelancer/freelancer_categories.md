## Результат

Скрипт отработал успешно — **3060 строк, 18 категорий** (с подкатегориями), файл `freelancer_categories.csv` уже скачивается.

---

### Структура страницы

Данные лежат в `<section>` элементах (индексы 2–19):
- `section > header > h3` — название категории + `(count)` → `"Websites, IT & Software (19157)"`
- `section > ul > li > a` — подкатегория + `(count)` + href → `".NET (45)"`

---

### Скрипт для DevTools Console

```javascript
// Запускать на https://www.freelancer.com/job/
const rows = [['Category', 'Category Count', 'Subcategory', 'Subcategory Count', 'URL']];

const sections = [...document.querySelectorAll('section')]
  .filter((s, i) => i >= 2 && i <= 19 && s.querySelector('header h3'));

sections.forEach(section => {
  const h3Text = section.querySelector('header h3')?.textContent?.trim() || '';
  const catMatch = h3Text.match(/^(.+?)\s*\((\d+)\)\s*$/);
  const catName = catMatch ? catMatch[1].trim() : h3Text;
  const catCount = catMatch ? catMatch[2] : '';

  const ul = section.children[1];
  const subcatItems = ul ? [...ul.querySelectorAll('li')] : [];

  if (subcatItems.length === 0) {
    rows.push([catName, catCount, '', '', '']);
  } else {
    subcatItems.forEach(li => {
      const a = li.querySelector('a');
      const text = (a || li).textContent.replace(/\s+/g, ' ').trim();
      const subMatch = text.match(/^(.+?)\s*\((\d+)\)\s*$/);
      const subName = subMatch ? subMatch[1].trim() : text;
      const subCount = subMatch ? subMatch[2] : '';
      const href = a ? a.href : '';
      rows.push([catName, catCount, subName, subCount, href]);
    });
  }
});

const csv = rows.map(r =>
  r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
).join('\n');

const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
const link = Object.assign(document.createElement('a'), {
  href: URL.createObjectURL(blob),
  download: 'freelancer_categories.csv'
});
document.body.appendChild(link);
link.click();
link.remove();

console.log(`✅ ${rows.length - 1} строк, ${sections.length} категорий`);
```

---

### Что получилось в CSV

| Category | Category Count | Subcategory | Subcategory Count | URL |
|---|---|---|---|---|
| Websites, IT & Software | 19157 | .NET | 45 | …/jobs/dot-net/ |
| Websites, IT & Software | 19157 | .NET Core | 20 | … |
| Design, Media & Architecture | 19396 | Graphic Design | 847 | … |
| … | … | … | … | … |

`\uFEFF` в начале — BOM для корректного открытия кириллицы в Excel.
