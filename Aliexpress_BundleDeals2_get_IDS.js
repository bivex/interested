(()=>{const allIds=new Set();const sd=window.__STREAMING_DATA__;if(sd){for(const section of Object.values(sd)){if(!Array.isArray(section?.data))continue;for(const group of section.data){if(group?.id&&/^[0-9]{13,}$/.test(String(group.id)))allIds.add(String(group.id));if(!Array.isArray(group?.products))continue;for(const p of group.products){if(p?.id&&/^[0-9]{13,}$/.test(String(p.id)))allIds.add(String(p.id));}}}}const imgs=Array.from(document.querySelectorAll('img')).filter(img=>(img.src||'').includes('aliexpress-media'));for(const img of imgs){let el=img;for(let i=0;i<15;i++){el=el.parentElement;if(!el)break;const fiberKey=Object.keys(el).find(k=>k.startsWith('__reactFiber')||k.startsWith('__reactInternalInstance'));if(!fiberKey)continue;let fiber=el[fiberKey];for(let j=0;j<30;j++){const id=fiber?.memoizedProps?.id;if(id&&/^[0-9]{13,}$/.test(String(id)))allIds.add(String(id));fiber=fiber?.return;if(!fiber)break;}}}const ids=[...allIds];console.log('Found: '+ids.length);console.log(JSON.stringify(ids));return ids;})();



Extract from Wholesale

(()=>{
  const isId = s => typeof s === 'string' && s.length >= 13 && /^\d+$/.test(s);
  const allIds = new Set();

  const sd = window.__STREAMING_DATA__;
  if (sd) {
    for (const section of Object.values(sd)) {
      if (!Array.isArray(section?.data)) continue;
      for (const group of section.data) {
        if (isId(String(group?.id))) allIds.add(String(group.id));
        if (!Array.isArray(group?.products)) continue;
        for (const p of group.products) {
          if (isId(String(p?.id))) allIds.add(String(p.id));
        }
      }
    }
  }

  document.querySelectorAll('a[href*="/item/"]').forEach(a => {
    const m = a.href.match(/\/item\/(\d+)\.html/);
    if (m && m[1].length >= 13) allIds.add(m[1]);
  });

  document.querySelectorAll('[data-product-id],[data-item-id],[data-id]').forEach(el => {
    const id = el.dataset.productId || el.dataset.itemId || el.dataset.id;
    if (isId(id)) allIds.add(id);
  });

  Array.from(document.querySelectorAll('img'))
    .filter(img => (img.src || '').includes('aliexpress-media'))
    .forEach(img => {
      let el = img;
      for (let i = 0; i < 15; i++) {
        el = el.parentElement;
        if (!el) break;
        const fk = Object.keys(el).find(k =>
          k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
        if (!fk) continue;
        let fiber = el[fk];
        for (let j = 0; j < 30; j++) {
          const id = fiber?.memoizedProps?.id;
          if (isId(String(id))) allIds.add(String(id));
          fiber = fiber?.return;
          if (!fiber) break;
        }
      }
    });

  [window.__pageData__, window.runParams, window._dida_data_].forEach(obj => {
    if (!obj) return;
    (JSON.stringify(obj).match(/\d+/g) || [])
      .filter(s => s.length >= 13)
      .forEach(id => allIds.add(id));
  });

  const ids = [...allIds];
  console.log('Found: ' + ids.length);
  console.log(JSON.stringify(ids));
  return ids;
})();
