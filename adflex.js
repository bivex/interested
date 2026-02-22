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
