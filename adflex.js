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
