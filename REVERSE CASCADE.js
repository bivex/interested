/**
 * CSS Cascade Inspector
 * Analyzes which styles won the cascade battle for a given element
 * @param {string|Element} target - CSS selector or DOM element
 * @param {Object} options - Configuration options
 */
(function inspectCascade(target, options) {
  'use strict';
  
  target = target || 'a';
  options = options || {};
  
  const config = {
    showAllProps: false,
    groupByProperty: true,
    includeInherited: false,
    filterProps: null,
    verbose: true,
    outputMarkdown: true,
    autoCopy: true,
    ...options
  };

  // ============================================================================
  // ELEMENT RESOLUTION
  // ============================================================================
  
  const element = typeof target === 'string' 
    ? document.querySelector(target)
    : target;
    
  if (!element) {
    console.error('❌ Element not found:', target);
    return null;
  }

  // ============================================================================
  // SPECIFICITY CALCULATION (W3C spec-compliant)
  // ============================================================================
  
  function calculateSpecificity(selector) {
    let normalized = selector.replace(/::[a-z-]+/gi, '');
    normalized = normalized.replace(/:where\([^)]*\)/g, '');
    normalized = normalized.replace(/:(?:not|is|has)\(([^)]*)\)/g, '$1');
    
    const counts = { ids: 0, classes: 0, elements: 0 };
    
    counts.ids = (normalized.match(/#[a-z0-9_-]+/gi) || []).length;
    counts.classes = (normalized.match(/(\.[a-z0-9_-]+|\[[^\]]+\]|:[a-z-]+(?!\())/gi) || []).length;
    counts.elements = (normalized.match(/(?:^|[\s>+~])(?![:,#\.\[])[a-z0-9_-]+/gi) || []).length;
    
    return {
      value: [counts.ids, counts.classes, counts.elements],
      toString() { return this.value.join(','); },
      compare(other) {
        for (let i = 0; i < 3; i++) {
          if (this.value[i] !== other.value[i]) {
            return this.value[i] - other.value[i];
          }
        }
        return 0;
      }
    };
  }

  // ============================================================================
  // STYLE COLLECTION
  // ============================================================================
  
  const computed = getComputedStyle(element);
  const declarations = new Map();
  
  class Declaration {
    constructor(data) {
      Object.assign(this, data);
      this.specificity = data.specificity || calculateSpecificity(data.selector);
    }
    
    compareTo(other) {
      if (this.isInline && !other.isInline) return !this.important && other.important ? -1 : 1;
      if (!this.isInline && other.isInline) return this.important && !other.important ? 1 : -1;
      
      if (this.important && !other.important) return 1;
      if (!this.important && other.important) return -1;
      
      const specDiff = this.specificity.compare(other.specificity);
      if (specDiff !== 0) return specDiff;
      
      return this.order - other.order;
    }
  }

  let globalOrder = 0;
  
  [...document.styleSheets].forEach((sheet) => {
    let rules;
    try {
      rules = [...sheet.cssRules];
    } catch (e) {
      console.warn('⚠️ Cannot access stylesheet:', sheet.href, e.message);
      return;
    }
    
    rules.forEach((rule) => {
      if (rule instanceof CSSStyleRule) {
        if (!element.matches(rule.selectorText)) return;
        
        [...rule.style].forEach(prop => {
          if (config.filterProps && !config.filterProps.includes(prop)) return;
          
          if (!declarations.has(prop)) declarations.set(prop, []);
          
          declarations.get(prop).push(new Declaration({
            property: prop,
            value: rule.style.getPropertyValue(prop),
            important: rule.style.getPropertyPriority(prop) === 'important',
            selector: rule.selectorText,
            source: sheet.href || (sheet.ownerNode?.id ? '<style id="' + sheet.ownerNode.id + '">' : '<style>'),
            isInline: false,
            order: globalOrder++
          }));
        });
      }
    });
  });

  [...element.style].forEach(prop => {
    if (config.filterProps && !config.filterProps.includes(prop)) return;
    
    if (!declarations.has(prop)) declarations.set(prop, []);
    
    declarations.get(prop).push(new Declaration({
      property: prop,
      value: element.style.getPropertyValue(prop),
      important: element.style.getPropertyPriority(prop) === 'important',
      selector: 'style=""',
      source: 'Inline',
      isInline: true,
      specificity: { value: [Infinity, 0, 0], toString: () => '∞,0,0', compare: () => 1 },
      order: globalOrder++
    }));
  });

  // ============================================================================
  // ANALYSIS
  // ============================================================================
  
  const results = {
    element: element,
    selector: target,
    overriddenProps: 0,
    totalDeclarations: 0,
    properties: {}
  };

  declarations.forEach((decls, prop) => {
    const sorted = decls.sort((a, b) => b.compareTo(a));
    const winner = sorted[0];
    const computedValue = computed.getPropertyValue(prop);
    
    results.totalDeclarations += decls.length;
    
    if (decls.length > 1) {
      results.overriddenProps++;
    }
    
    if (!config.showAllProps && decls.length === 1) return;
    
    results.properties[prop] = {
      computed: computedValue,
      winner: winner,
      cascade: sorted,
      overrideCount: decls.length - 1
    };
  });

  // ============================================================================
  // MARKDOWN GENERATION
  // ============================================================================
  
  function generateMarkdown() {
    let md = '# CSS Cascade Report\n\n';
    md += '**Element:** `' + target + '`\n\n';
    md += '**Stats:**\n';
    md += '- Properties with overrides: ' + results.overriddenProps + '\n';
    md += '- Total declarations: ' + results.totalDeclarations + '\n\n';
    md += '---\n\n';
    
    Object.entries(results.properties).forEach(([prop, data]) => {
      const { computed, cascade, overrideCount } = data;
      
      md += '## `' + prop + '`\n\n';
      md += '**Computed value:** `' + computed + '`\n\n';
      
      if (overrideCount > 0) {
        md += '**Override count:** ' + overrideCount + '\n\n';
      }
      
      md += '| Status | Value | Selector | Specificity | Source |\n';
      md += '|--------|-------|----------|-------------|--------|\n';
      
      cascade.forEach((decl, index) => {
        const isWinner = index === 0;
        const status = isWinner ? '✅ APPLIED' : '❌ OVERRIDDEN';
        const value = '`' + decl.value + (decl.important ? ' !important' : '') + '`';
        const selector = '`' + decl.selector + '`';
        const specificity = '`' + decl.specificity.toString() + '`';
        const source = decl.source.startsWith('http') 
          ? '[Link](' + decl.source + ')' 
          : '`' + decl.source + '`';
        
        md += '| ' + status + ' | ' + value + ' | ' + selector + ' | ' + specificity + ' | ' + source + ' |\n';
      });
      
      md += '\n';
    });
    
    return md;
  }

  // ============================================================================
  // COPY TO CLIPBOARD (with fallback)
  // ============================================================================
  
  function copyToClipboard(text) {
    // Modern Clipboard API (requires user interaction + focus)
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
        .then(() => {
          console.log('📋 Markdown report copied to clipboard!');
          return true;
        })
        .catch(() => {
          return fallbackCopy(text);
        });
    } else {
      return fallbackCopy(text);
    }
  }
  
  function fallbackCopy(text) {
    // Fallback: create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    
    try {
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        console.log('📋 Markdown report copied to clipboard (fallback method)!');
        return Promise.resolve(true);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      document.body.removeChild(textarea);
      console.warn('⚠️ Could not copy to clipboard. Copy manually from the log below:');
      console.log('\n' + text + '\n');
      return Promise.resolve(false);
    }
  }

  // ============================================================================
  // CONSOLE OUTPUT
  // ============================================================================
  
  console.group('🎯 CSS Cascade for ' + target);
  console.log('Element:', element);
  console.log('Stats:', {
    'Properties with overrides': results.overriddenProps,
    'Total declarations': results.totalDeclarations
  });
  
  Object.entries(results.properties).forEach(([prop, data]) => {
    const { computed, cascade, overrideCount } = data;
    
    if (overrideCount === 0 && !config.showAllProps) return;
    
    console.group(
      '%c' + prop + '%c: ' + computed + ' %c(' + overrideCount + ' override' + (overrideCount === 1 ? '' : 's') + ')',
      'font-weight:bold;color:#0066cc',
      'color:inherit',
      'color:#666;font-size:0.9em'
    );
    
    cascade.forEach((decl, index) => {
      const isWinner = index === 0;
      const icon = isWinner ? '✅' : '❌';
      const label = isWinner ? 'APPLIED' : 'OVERRIDDEN';
      
      const logData = {
        value: decl.value + (decl.important ? ' !important' : ''),
        selector: decl.selector,
        specificity: decl.specificity.toString()
      };
      
      if (config.verbose) {
        logData.source = decl.source;
        logData.order = decl.order;
      }
      
      console.log(icon + ' ' + label, logData);
    });
    
    console.groupEnd();
  });
  
  console.groupEnd();
  
  // ============================================================================
  // MARKDOWN OUTPUT & CLIPBOARD
  // ============================================================================
  
  if (config.outputMarkdown) {
    const markdown = generateMarkdown();
    results.markdown = markdown;
    
    if (config.autoCopy) {
      copyToClipboard(markdown);
    }
    
    // Provide manual copy method
    results.copy = function() {
      return copyToClipboard(this.markdown);
    };
  }
  
  return results;
})();
