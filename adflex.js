//Open DevTools → Console tab on the AdFlex search page
//Paste the script and hit Enter
//Results appear as a console.table() and are auto-copied to your clipboard as JSON
//You can also access the data via window.__adflexOffers for further filtering/manipulation

(function extractAdFlexOffers() {
  // Select only full ad cards (those containing the info list panel)
  const cards = Array.from(
    document.querySelectorAll('[class*="flexad-card"]')
  ).filter(card => card.querySelector('.bg-gray-100'));
  function extractOffer(card) {
    // ── Header ──────────────────────────────────────────────
    const advertiser = card.querySelector('span[class*="group-hover"]')?.innerText?.trim() ?? '';
    const date       = card.querySelector('[class*="text-gray-600"]')?.innerText?.trim()    ?? '';
    const caption    = card.querySelector('div.truncate')?.innerText?.trim()               ?? '';
    // ── Engagement stats (likes / shares / comments) ────────
    const statDivs = card.querySelectorAll('[class*="gap-x-1"]');
    const [likes = '', shares = '', comments = ''] =
      Array.from(statDivs).map(d => d.innerText?.trim());
    // ── Info list rows (View Count / Region / Days Running) ──
    const infoRows = card.querySelectorAll('.bg-gray-100 > div');
    const info = {};
    infoRows.forEach(row => {
      const label  = row.querySelector(':scope > div:first-child')?.innerText?.trim();
      const valEl  = row.querySelector(':scope > div:last-child');
      // Region is a flag sprite — extract the 2-letter country code from its class
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
  const results = cards.map(extractOffer);
  // Pretty-print in the console
  console.log(`✅ Extracted ${results.length} offers from current page`);
  console.table(results);
  // Also copy JSON to clipboard for easy export
  const json = JSON.stringify(results, null, 2);
  navigator.clipboard.writeText(json)
    .then(() => console.log('📋 JSON copied to clipboard!'))
    .catch(() => console.log('ℹ️ Could not auto-copy. Access results via window.__adflexOffers'));
  // Expose globally for further manipulation
  window.__adflexOffers = results;
  return results;
})();
