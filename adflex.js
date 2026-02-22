//Open DevTools → Console tab on the AdFlex search page
//Paste the script and hit Enter
//Results appear as a console.table() and are auto-copied to your clipboard as JSON
//You can also access the data via window.__adflexOffers for further filtering/manipulation

(function extractAdFlexOffers() {
  // Accumulate into a global array across multiple runs (scroll & re-run)
  if (!window.__adflexOffers) window.__adflexOffers = [];
  const cards = Array.from(
    document.querySelectorAll('[class*="flexad-card"]')
  ).filter(card => card.querySelector('.bg-gray-100'));
  function extractOffer(card) {
    const advertiser = card.querySelector('span[class*="group-hover"]')?.innerText?.trim() ?? '';
    const date       = card.querySelector('[class*="text-gray-600"]')?.innerText?.trim()    ?? '';
    const caption    = card.querySelector('div.truncate')?.innerText?.trim()               ?? '';
    const statDivs = card.querySelectorAll('[class*="gap-x-1"]');
    const [likes = '', shares = '', comments = ''] =
      Array.from(statDivs).map(d => d.innerText?.trim());
    const infoRows = card.querySelectorAll('.bg-gray-100 > div');
    const info = {};
    infoRows.forEach(row => {
      const label  = row.querySelector(':scope > div:first-child')?.innerText?.trim();
      const valEl  = row.querySelector(':scope > div:last-child');
      const flagEl = valEl?.querySelector('[class*="sprite-flag"]');
      const value  = flagEl
        ? (flagEl.className.match(/sprite-flag-([a-z]+)/)?.[1] ?? '').toUpperCase()
        : valEl?.innerText?.trim();
      if (label) info[label] = value ?? '';
    });
    return {
      advertiser,
      date,
      caption,
      likes,
      shares,
      comments,
      viewCount:   info['View Count']   ?? '',
      region:      info['Region']       ?? '',
      daysRunning: info['Days Running'] ?? '',
    };
  }
  // De-duplicate by advertiser+date+caption key
  const existingKeys = new Set(
    window.__adflexOffers.map(o => `${o.advertiser}|${o.date}|${o.caption}`)
  );
  const newOffers = cards
    .map(extractOffer)
    .filter(o => {
      const key = `${o.advertiser}|${o.date}|${o.caption}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
  window.__adflexOffers.push(...newOffers);
  // ── Display ──────────────────────────────────────────────
  console.log(`✅ +${newOffers.length} new | 📦 Total: ${window.__adflexOffers.length} offers`);
  console.table(newOffers);
  // ── Copy ALL accumulated offers to clipboard ─────────────
  const json = JSON.stringify(window.__adflexOffers, null, 2);
  navigator.clipboard.writeText(json)
    .then(() => console.log(`📋 ALL ${window.__adflexOffers.length} offers copied to clipboard!`))
    .catch(() => console.warn('⚠️ Clipboard blocked. Run: copy(window.__adflexOffers)'));
  return window.__adflexOffers;
})();



//for Meta
(function extractAdFlexMetaOffers() {
  if (!window.__adflexOffers) window.__adflexOffers = [];
  const cards = Array.from(
    document.querySelectorAll('[class*="flexad-card"]')
  ).filter(card => card.querySelector('.bg-gray-100'));
  function extractOffer(card) {
    // ── Header ───────────────────────────────────────────────
    const advertiser = card.querySelector('span[class*="group-hover"]')?.textContent?.trim() ?? '';
    const date       = card.querySelector('[class*="text-gray-600"]')?.textContent?.trim()   ?? '';
    const status     = card.querySelector('span[class*="bg-green"], span[class*="bg-red"], span[class*="bg-gray"]')
                           ?.parentElement?.textContent?.trim() ?? '';
    // ── Ad content (div.truncate order: body → headline → rating) ──
    const truncDivs = Array.from(card.querySelectorAll('div.truncate'));
    const adText   = truncDivs[0]?.textContent?.trim() ?? '';
    const headline = truncDivs[1]?.textContent?.trim() ?? '';
    const rating   = truncDivs[2]?.textContent?.trim() ?? '';
    const domain   = card.querySelector('[class*="truncate w-"]')?.textContent?.trim() ?? '';
    // ── Info list rows ────────────────────────────────────────
    const infoRows = card.querySelectorAll('.bg-gray-100 > div');
    const info = {};
    infoRows.forEach(row => {
      const label = row.querySelector(':scope > div:first-child')?.textContent?.trim();
      const valEl = row.querySelector(':scope > div:last-child');
      if (label === 'Platform') {
        // Extract platform names from sprite class  e.g. platforms-meta-facebook
        const spans = valEl?.querySelectorAll('span[class*="platforms-meta"]');
        info[label] = Array.from(spans ?? [])
          .map(s => s.className.match(/platforms-meta-(\\w+)/)?.[1])
          .filter(Boolean).join(', ');
      } else if (label === 'Region') {
        // Flag sprites → country codes + overflow badge e.g. "+6"
        const flags = valEl?.querySelectorAll('[class*="sprite-flag"]');
        const extra = valEl?.querySelector('[class*="bg-white"]')?.textContent?.trim() ?? '';
        const codes = Array.from(flags ?? [])
          .map(f => f.className.match(/sprite-flag-([a-z]+)/)?.[1]?.toUpperCase())
          .filter(Boolean);
        if (extra) codes.push(extra);
        info[label] = codes.join(', ');
      } else if (label) {
        info[label] = valEl?.textContent?.trim() ?? '';
      }
    });
    return {
      advertiser,
      date,
      status,
      adText,
      headline,
      rating,
      domain,
      platforms:   info['Platform']     ?? '',
      region:      info['Region']       ?? '',
      daysRunning: info['Days Running'] ?? '',
    };
  }
  // De-duplicate by advertiser + date + headline
  const existingKeys = new Set(
    window.__adflexOffers.map(o => `${o.advertiser}|${o.date}|${o.headline}`)
  );
  const newOffers = cards
    .map(extractOffer)
    .filter(o => {
      const key = `${o.advertiser}|${o.date}|${o.headline}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
  window.__adflexOffers.push(...newOffers);
  // ── Output ───────────────────────────────────────────────
  console.log(`✅ +${newOffers.length} new | 📦 Total: ${window.__adflexOffers.length} offers`);
  console.table(newOffers);
  // Copy all to clipboard
  try {
    copy(window.__adflexOffers);
    console.log(`📋 ALL ${window.__adflexOffers.length} offers copied to clipboard!`);
  } catch (e) {
    navigator.clipboard.writeText(JSON.stringify(window.__adflexOffers, null, 2))
      .then(() => console.log(`📋 ALL ${window.__adflexOffers.length} offers copied!`))
      .catch(() => console.warn('⚠️ Run manually: copy(window.__adflexOffers)'));
  }
  return window.__adflexOffers;
})();


///////////////////////////////////////////////

// На детальной странице (`/meta/ads/:id`) доступно **намного больше данных**. Вот что удалось вытащить:

// | Секция | Поля |
// |---|---|
// | **Тайминг** | `fromDate`, `toDate`, `daysRunning`, `totalSeen` |
// | **Устройства** | `devices[]` → `{ device, count }` |
// | **Таргетинг** | `ctaType`, `gender`, `ageRange`, `specialCategory` |
// | **Гео/Платформы** | `region`, `platforms` |
// | **Домен** | `domainName`, `monthlyVisit`, `domainCreated`, `domainUpdated`, `domainExpire` |
// | **Технологии** | `technologies{}` → 14 категорий (CDN, CMS, Analytics, Payment, JS libs...) |
// | **URL Chains** | `urlChains[]` → реальные ссылки куда ведёт реклама |

// ---

// Скрипт для **детальной страницы** (запускать находясь на `/meta/ads/:id`):

// ```js
// (function extractMetaAdDetail() {
//   const boxes    = Array.from(document.querySelectorAll('[class*="rounded-lg"][class*="shadow"]'));
//   const findBox  = (start) => boxes.find(b => b.innerText?.trim().startsWith(start));
//   const findBoxC = (kw)    => boxes.find(b => b.innerText?.includes(kw));

//   // ── [Box 1] Timeline + Devices ───────────────────────────
//   const timelineBox = boxes[1];
//   const leftCol     = timelineBox?.children?.[0];
//   const rightCol    = timelineBox?.children?.[1];
//   const dateBlocks  = Array.from(leftCol?.querySelectorAll('[class*="flex-col"][class*="items-center"]') ?? []);

//   const parseBlock = (block) => {
//     const date = block?.querySelector('[class*="font-semibold"]')?.innerText?.trim() ?? '';
//     const year = Array.from(block?.querySelectorAll('[class*="text-gray-500"]') ?? [])
//                    .map(e => e.innerText?.trim()).find(t => /^\d{4}$/.test(t)) ?? '';
//     return date + (year ? ' ' + year : '');
//   };

//   const fromDate    = parseBlock(dateBlocks[0]);
//   const daysRunning = dateBlocks[1]?.querySelector('[class*="font-semibold"]')?.innerText?.trim() ?? '';
//   const toDate      = parseBlock(dateBlocks[2]);
//   const totalSeen   = rightCol?.querySelector('[class*="font-semibold"][class*="text-h"]')?.innerText?.trim() ?? '';
//   const devices     = Array.from(rightCol?.querySelectorAll('[class*="justify-between"][class*="mt"]') ?? [])
//     .map(row => ({
//       device: row.querySelector('[class*="font-light"]')?.innerText?.trim() ?? '',
//       count:  row.querySelector('[class*="font-medium"]')?.innerText?.trim() ?? ''
//     }));

//   // ── [Box 2] Advertiser + Ad text ─────────────────────────
//   const adBox      = boxes[2];
//   const advertiser = adBox?.querySelector('span[class*="group-hover"]')?.innerText?.trim()   ?? '';
//   const adStatus   = adBox?.querySelector('[class*="bg-green"],[class*="bg-red"]')
//                          ?.parentElement?.innerText?.trim() ?? '';
//   const adText     = document.title.replace(/^AdFlex \| /, '').trim();

//   // ── [Box 3] CTA / Gender / Age / Special Category ────────
//   const metaRows = Array.from(boxes[3]?.querySelectorAll('[class*="justify-between"]') ?? []);
//   const meta = {};
//   metaRows.forEach(row => {
//     const label = row.querySelector('[class*="whitespace-nowrap"]')?.innerText?.trim();
//     const val   = row.querySelector('[class*="divide-x"],[class*="flex-wrap"]')?.innerText
//                     ?.trim().replace(/\s*\|\s*/g, ', ') ?? '';
//     if (label) meta[label] = val;
//   });

//   // ── [Box 4] Region  [Box 5] Platforms ────────────────────
//   const region    = findBox('Region')   ?.innerText?.replace('Region',    '').trim() ?? '';
//   const platforms = findBox('Platforms')?.innerText?.replace('Platforms', '').trim().replace(/\n/g, ', ') ?? '';

//   // ── [Box 6] Domain info ──────────────────────────────────
//   const domainBox    = findBoxC('Domain info');
//   const domainName   = domainBox?.querySelector('a[class*="underline"]')?.innerText?.trim() ?? '';
//   const monthlyVisit = domainBox?.querySelector('[class*="font-semibold"][class*="text-h"]')?.innerText?.trim() ?? '';

//   const parseDomainDate = (label) => {
//     const spans = Array.from(domainBox?.querySelectorAll('span') ?? []);
//     const i     = spans.findIndex(s => s.innerText?.trim() === label);
//     if (i < 0) return '';
//     return (spans[i + 1]?.innerText?.trim() ?? '') + ' ' + (spans[i + 2]?.innerText?.trim() ?? '');
//   };

//   // ── [Box 8] Technologies ─────────────────────────────────
//   const techBox  = findBoxC('Technologies');
//   const technologies = {};
//   Array.from(techBox?.querySelectorAll('[class*="justify-between"][class*="font-light"]') ?? [])
//     .forEach(row => {
//       const label = row.querySelector('[class*="font-medium"]')?.innerText?.trim();
//       const vals  = Array.from(row.querySelectorAll('a')).map(a => a.innerText?.trim()).filter(Boolean).join(', ');
//       if (label) technologies[label] = vals;
//     });

//   // ── [Box 9] URL Chains ───────────────────────────────────
//   const urlChains = Array.from(findBoxC('URL Chains')?.querySelectorAll('a[href]') ?? [])
//     .map(a => a.href).filter(u => u.startsWith('http'));

//   const result = {
//     adId:            window.location.pathname.split('/').pop(),
//     advertiser,      adStatus,         adText,
//     fromDate,        daysRunning,      toDate,
//     totalSeen,       devices,
//     ctaType:         meta['CTA Type']             ?? '',
//     gender:          meta['Gender']               ?? '',
//     ageRange:        meta['Age Range']            ?? '',
//     specialCategory: meta['Special Category Ads'] ?? '',
//     region,          platforms,
//     domainName,      monthlyVisit,
//     domainCreated:   parseDomainDate('Created'),
//     domainUpdated:   parseDomainDate('Updated'),
//     domainExpire:    parseDomainDate('Expire'),
//     technologies,    urlChains,
//   };

//   console.log(`✅ Extracted ad ${result.adId} — ${result.advertiser}`);
//   console.table({ ...result, technologies: JSON.stringify(result.technologies), urlChains: result.urlChains.join(', '), devices: JSON.stringify(result.devices) });

//   // Save & copy
//   if (!window.__adflexDetails) window.__adflexDetails = [];
//   window.__adflexDetails.push(result);

//   try {
//     copy(window.__adflexDetails);
//     console.log(`📋 ALL ${window.__adflexDetails.length} detail records copied!`);
//   } catch {
//     console.warn('Run: copy(window.__adflexDetails)');
//   }

//   return result;
// })();
// ```

// **Два варианта использования:**

// **А) Ручной** — открываешь каждый `/meta/ads/:id`, запускаешь скрипт. Все записи копятся в `window.__adflexDetails[]`.

// **Б) Автоматический** — добавить к скрипту списка обход всех `Show Details` ссылок через `fetch` + парсинг HTML в фоне (но это отдельный скрипт, скажи если нужен).


//   ///////////////////////////////////////
