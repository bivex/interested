(() => {
  const allIds = new Set();
  // 1. Из __STREAMING_DATA__ (первоначальная загрузка)
  const sd = window.__STREAMING_DATA__;
  if (sd) {
    const str = JSON.stringify(sd);
    // Flat items (section 2198215910 и др.)
    const re1 = /"id"\\s*:\\s*"?(\\d{13,})"?/g;
    let m;
    while ((m = re1.exec(str)) !== null) allIds.add(m[1]);
    // Nested products arrays (section 6795818760)
    for (const section of Object.values(sd)) {
      if (!Array.isArray(section?.data)) continue;
      for (const group of section.data) {
        if (!Array.isArray(group?.products)) continue;
        for (const p of group.products) {
          if (p?.id && /^\\d{13,}$/.test(String(p.id))) allIds.add(String(p.id));
        }
      }
    }
  }
  // 2. Из React Fiber (lazy-loaded товары при скролле)
  const imgs = Array.from(document.querySelectorAll('img'))
    .filter(img => (img.src || '').includes('aliexpress-media'));
  for (const img of imgs) {
    let el = img;
    for (let i = 0; i < 15; i++) {
      el = el.parentElement;
      if (!el) break;
      const fiberKey = Object.keys(el).find(k =>
        k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
      );
      if (!fiberKey) continue;
      let fiber = el[fiberKey];
      for (let j = 0; j < 30; j++) {
        const id = fiber?.memoizedProps?.id;
        if (id && /^\\d{13,}$/.test(String(id))) allIds.add(String(id));
        fiber = fiber?.return;
        if (!fiber) break;
      }
    }
  }
  const ids = [...allIds];
  console.log(`✅ Найдено ${ids.length} Bundle Deal IDs:`);
  console.log(ids.join('\\n'));
  console.log('\\n📋 Массив для копирования:');
  console.log(JSON.stringify(ids));
  return ids;
})();
