(function inspectOverrides(selector = 'a') {
  const el = document.querySelector(selector);
  if (!el) return console.warn('Element not found:', selector);

  const computed = getComputedStyle(el);
  const overrides = {};

  function specificity(sel) {
    return sel
      .replace(/:not\(([^)]*)\)/g, '$1')
      .match(/[#.]|\w+/g)
      ?.reduce((acc, part) => {
        if (part.startsWith('#')) acc[0]++;
        else if (part.startsWith('.')) acc[1]++;
        else acc[2]++;
        return acc;
      }, [0, 0, 0])
      .join(',') || '0,0,0';
  }

  [...document.styleSheets].forEach((sheet, sheetIndex) => {
    try {
      [...sheet.cssRules].forEach((rule, ruleIndex) => {
        if (!rule.selectorText || !el.matches(rule.selectorText)) return;

        [...rule.style].forEach(prop => {
          if (!overrides[prop]) overrides[prop] = [];

          overrides[prop].push({
            value: rule.style.getPropertyValue(prop),
            important: rule.style.getPropertyPriority(prop),
            selector: rule.selectorText,
            specificity: specificity(rule.selectorText),
            source: sheet.href || 'INLINE <style>',
            order: `${sheetIndex}:${ruleIndex}`
          });
        });
      });
    } catch (e) {}
  });

  /* INLINE STYLES (MAX PRIORITY) */
  [...el.style].forEach(prop => {
    overrides[prop] = overrides[prop] || [];
    overrides[prop].push({
      value: el.style.getPropertyValue(prop),
      important: el.style.getPropertyPriority(prop),
      selector: 'INLINE style=""',
      specificity: '∞,∞,∞',
      source: 'INLINE attribute',
      order: 'MAX'
    });
  });

  console.group(`⚔️ Style overrides (REVERSE) for ${selector}`);

  Object.entries(overrides).forEach(([prop, rules]) => {
    const finalValue = computed.getPropertyValue(prop);

    if (rules.length > 1) {
      console.group(`🧨 ${prop} → ${finalValue}`);

      rules
        .reverse() // ⬅️ РЕВЕРС
        .forEach((r, i) => {
          console.log(
            `${i === 0 ? '✅ FINAL' : '❌ OVERRIDDEN'}`,
            {
              value: r.value,
              important: r.important || '-',
              selector: r.selector,
              specificity: r.specificity,
              source: r.source,
              order: r.order
            }
          );
        });

      console.groupEnd();
    }
  });

  console.groupEnd();
})();
