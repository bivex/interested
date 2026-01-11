/**
 * Color Contrast Conflict Detector
 * Finds elements with poor color contrast (WCAG violations)
 * @param {Object} options - Configuration options
 */
(function detectContrastConflicts(options) {
  'use strict';
  
  options = options || {};
  
  const config = {
    wcagLevel: 'AA',              // 'AA' or 'AAA'
    minContrastNormal: 4.5,       // WCAG AA for normal text
    minContrastLarge: 3,          // WCAG AA for large text (18pt+)
    minContrastAAA: 7,            // WCAG AAA
    scanDepth: 'full',            // 'viewport' or 'full'
    includeHidden: false,         // Include hidden elements
    outputMarkdown: true,
    ...options
  };

  // Set thresholds based on WCAG level
  if (config.wcagLevel === 'AAA') {
    config.minContrastNormal = 7;
    config.minContrastLarge = 4.5;
  }

  // ============================================================================
  // COLOR UTILITIES
  // ============================================================================
  
  function parseColor(colorStr) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1).data;
    
    return {
      r: imageData[0],
      g: imageData[1],
      b: imageData[2],
      a: imageData[3] / 255
    };
  }
  
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1.r, color1.g, color1.b);
    const lum2 = getLuminance(color2.r, color2.g, color2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }
  
  function isLargeText(fontSize, fontWeight) {
    const size = parseFloat(fontSize);
    const weight = parseInt(fontWeight) || 400;
    
    // 18pt+ or 14pt+ bold
    return size >= 24 || (size >= 18.66 && weight >= 700);
  }
  
  function getEffectiveBackground(element) {
    let el = element;
    let bg = parseColor('rgba(0,0,0,0)');
    
    // Walk up the DOM tree to find opaque background
    while (el && el !== document.body.parentElement) {
      const styles = getComputedStyle(el);
      const bgColor = parseColor(styles.backgroundColor);
      
      if (bgColor.a > 0) {
        if (bgColor.a === 1) {
          return bgColor;
        }
        // Alpha blend
        bg = {
          r: bgColor.r * bgColor.a + bg.r * (1 - bgColor.a),
          g: bgColor.g * bgColor.a + bg.g * (1 - bgColor.a),
          b: bgColor.b * bgColor.a + bg.b * (1 - bgColor.a),
          a: 1
        };
        if (bg.a >= 0.9) return bg;
      }
      
      el = el.parentElement;
    }
    
    // Default to white if no background found
    return bg.a > 0 ? bg : { r: 255, g: 255, b: 255, a: 1 };
  }

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================
  
  const conflicts = [];
  const stats = {
    totalElements: 0,
    textElements: 0,
    conflicts: 0,
    severe: 0,      // < 2:1
    critical: 0,    // 2:1 - 3:1
    warning: 0      // 3:1 - 4.5:1
  };
  
  function getSelectorPath(element) {
    if (element.id) return '#' + element.id;
    
    const path = [];
    let el = element;
    
    while (el && el !== document.body && path.length < 3) {
      let selector = el.tagName.toLowerCase();
      
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).slice(0, 2);
        if (classes.length > 0 && classes[0]) {
          selector += '.' + classes.join('.');
        }
      }
      
      path.unshift(selector);
      el = el.parentElement;
    }
    
    return path.join(' > ');
  }
  
  function analyzeElement(element) {
    stats.totalElements++;
    
    // Skip non-text elements
    const hasText = element.textContent && element.textContent.trim().length > 0;
    if (!hasText) return;
    
    // Skip if no text visible
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    stats.textElements++;
    
    const styles = getComputedStyle(element);
    
    // Skip if display:none or visibility:hidden
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      if (!config.includeHidden) return;
    }
    
    const textColor = parseColor(styles.color);
    const bgColor = getEffectiveBackground(element);
    
    // Skip if text is transparent
    if (textColor.a < 0.1) return;
    
    const contrast = getContrastRatio(textColor, bgColor);
    const fontSize = styles.fontSize;
    const fontWeight = styles.fontWeight;
    const isLarge = isLargeText(fontSize, fontWeight);
    
    const requiredContrast = isLarge ? config.minContrastLarge : config.minContrastNormal;
    const passesWCAG = contrast >= requiredContrast;
    
    if (!passesWCAG) {
      stats.conflicts++;
      
      let severity;
      if (contrast < 2) {
        severity = 'severe';
        stats.severe++;
      } else if (contrast < 3) {
        severity = 'critical';
        stats.critical++;
      } else {
        severity = 'warning';
        stats.warning++;
      }
      
      conflicts.push({
        element: element,
        selector: getSelectorPath(element),
        text: element.textContent.trim().substring(0, 50),
        textColor: {
          hex: rgbToHex(textColor.r, textColor.g, textColor.b),
          rgb: 'rgb(' + Math.round(textColor.r) + ', ' + Math.round(textColor.g) + ', ' + Math.round(textColor.b) + ')'
        },
        bgColor: {
          hex: rgbToHex(bgColor.r, bgColor.g, bgColor.b),
          rgb: 'rgb(' + Math.round(bgColor.r) + ', ' + Math.round(bgColor.g) + ', ' + Math.round(bgColor.b) + ')'
        },
        contrast: contrast,
        required: requiredContrast,
        fontSize: fontSize,
        fontWeight: fontWeight,
        isLarge: isLarge,
        severity: severity,
        wcagLevel: config.wcagLevel,
        passes: passesWCAG
      });
    }
  }
  
  // Scan elements
  const elements = config.scanDepth === 'viewport'
    ? Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })
    : document.querySelectorAll('*');
  
  console.log('🔍 Scanning ' + elements.length + ' elements for contrast issues...');
  
  elements.forEach(analyzeElement);
  
  // Sort by severity and contrast
  conflicts.sort((a, b) => {
    const severityOrder = { severe: 0, critical: 1, warning: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.contrast - b.contrast;
  });

  // ============================================================================
  // RESULTS
  // ============================================================================
  
  const results = {
    conflicts: conflicts,
    stats: stats,
    wcagLevel: config.wcagLevel,
    thresholds: {
      normal: config.minContrastNormal,
      large: config.minContrastLarge
    }
  };

  // ============================================================================
  // MARKDOWN GENERATION
  // ============================================================================
  
  function generateMarkdown() {
    let md = '# Color Contrast Conflicts Report\n\n';
    md += '**Website:** `' + window.location.hostname + '`\n';
    md += '**WCAG Level:** ' + config.wcagLevel + '\n\n';
    
    md += '## Summary\n\n';
    md += '- Total elements scanned: ' + stats.totalElements + '\n';
    md += '- Text elements analyzed: ' + stats.textElements + '\n';
    md += '- **Total conflicts: ' + stats.conflicts + '**\n';
    md += '  - 🔴 Severe (< 2:1): ' + stats.severe + '\n';
    md += '  - 🟠 Critical (2:1 - 3:1): ' + stats.critical + '\n';
    md += '  - 🟡 Warning (3:1 - 4.5:1): ' + stats.warning + '\n\n';
    md += '---\n\n';
    
    if (conflicts.length === 0) {
      md += '## ✅ No Contrast Issues Found!\n\n';
      md += 'All text elements meet WCAG ' + config.wcagLevel + ' standards.\n';
      return md;
    }
    
    md += '## Conflicts\n\n';
    
    const severityIcons = {
      severe: '🔴',
      critical: '🟠',
      warning: '🟡'
    };
    
    conflicts.forEach((conflict, index) => {
      const icon = severityIcons[conflict.severity];
      
      md += '### ' + icon + ' Conflict #' + (index + 1) + ' - ' + conflict.severity.toUpperCase() + '\n\n';
      
      md += '**Element:** `' + conflict.selector + '`\n\n';
      md += '**Text preview:** "' + conflict.text + '..."\n\n';
      
      md += '| Property | Value |\n';
      md += '|----------|-------|\n';
      md += '| Text Color | ![](https://via.placeholder.com/20x20/' + conflict.textColor.hex.slice(1) + '/' + conflict.textColor.hex.slice(1) + '.png) `' + conflict.textColor.hex + '` |\n';
      md += '| Background | ![](https://via.placeholder.com/20x20/' + conflict.bgColor.hex.slice(1) + '/' + conflict.bgColor.hex.slice(1) + '.png) `' + conflict.bgColor.hex + '` |\n';
      md += '| **Contrast Ratio** | **' + conflict.contrast.toFixed(2) + ':1** |\n';
      md += '| Required (WCAG ' + conflict.wcagLevel + ') | ' + conflict.required.toFixed(1) + ':1 |\n';
      md += '| Font Size | ' + conflict.fontSize + ' |\n';
      md += '| Font Weight | ' + conflict.fontWeight + ' |\n';
      md += '| Large Text | ' + (conflict.isLarge ? 'Yes' : 'No') + ' |\n\n';
      
      md += '**Fix suggestions:**\n';
      md += '```css\n';
      md += '/* Option 1: Darken text */\n';
      md += conflict.selector + ' {\n';
      md += '  color: #000000; /* or appropriate dark color */\n';
      md += '}\n\n';
      md += '/* Option 2: Lighten background */\n';
      md += conflict.selector + ' {\n';
      md += '  background-color: #FFFFFF; /* or appropriate light color */\n';
      md += '}\n';
      md += '```\n\n';
      
      md += '---\n\n';
    });
    
    return md;
  }

  // ============================================================================
  // SMART CLIPBOARD COPY
  // ============================================================================
  
  function smartCopy(text) {
    if (document.hasFocus()) {
      return navigator.clipboard.writeText(text)
        .then(() => {
          console.log('📋 Contrast report copied to clipboard!');
          return true;
        })
        .catch((err) => {
          console.error('❌ Copy failed:', err.message);
          console.log('💡 Tip: Click the page first, then run: result.copy()');
          return false;
        });
    } else {
      console.warn('⚠️ Document not focused. Click the page first, then run: result.copy()');
      return Promise.resolve(false);
    }
  }

  // ============================================================================
  // CONSOLE OUTPUT
  // ============================================================================
  
  console.group('⚠️ Color Contrast Analysis (WCAG ' + config.wcagLevel + ')');
  console.log('Elements scanned:', stats.totalElements);
  console.log('Text elements:', stats.textElements);
  console.log('Conflicts found:', stats.conflicts);
  console.log('  🔴 Severe:', stats.severe);
  console.log('  🟠 Critical:', stats.critical);
  console.log('  🟡 Warning:', stats.warning);
  
  if (conflicts.length > 0) {
    console.group('📋 Conflicts (sorted by severity)');
    
    conflicts.forEach((conflict, index) => {
      const icon = conflict.severity === 'severe' ? '🔴' : conflict.severity === 'critical' ? '🟠' : '🟡';
      
      console.group(icon + ' #' + (index + 1) + ' ' + conflict.selector + ' (' + conflict.contrast.toFixed(2) + ':1)');
      console.log('Text:', conflict.text);
      console.log(
        'Colors: %c   %c vs %c   %c',
        'background:' + conflict.textColor.hex + ';padding:10px;border:1px solid #000',
        'color:inherit',
        'background:' + conflict.bgColor.hex + ';padding:10px;border:1px solid #000',
        'color:inherit'
      );
      console.log('Contrast:', conflict.contrast.toFixed(2) + ':1 (required: ' + conflict.required.toFixed(1) + ':1)');
      console.log('Font:', conflict.fontSize + ', weight ' + conflict.fontWeight);
      console.log('Element:', conflict.element);
      console.groupEnd();
    });
    
    console.groupEnd();
  }
  
  console.groupEnd();
  
  // ============================================================================
  // HIGHLIGHT CONFLICTS ON PAGE
  // ============================================================================
  
  results.highlight = function() {
    conflicts.forEach(conflict => {
      conflict.element.style.outline = '3px solid red';
      conflict.element.style.outlineOffset = '2px';
      conflict.element.title = 'Contrast issue: ' + conflict.contrast.toFixed(2) + ':1 (need ' + conflict.required.toFixed(1) + ':1)';
    });
    console.log('🎨 Highlighted ' + conflicts.length + ' elements with contrast issues');
  };
  
  results.removeHighlight = function() {
    conflicts.forEach(conflict => {
      conflict.element.style.outline = '';
      conflict.element.style.outlineOffset = '';
      conflict.element.title = '';
    });
    console.log('✅ Removed highlights');
  };

  // ============================================================================
  // MARKDOWN OUTPUT & COPY
  // ============================================================================
  
  if (config.outputMarkdown) {
    const markdown = generateMarkdown();
    results.markdown = markdown;
    
    results.copy = function() {
      return smartCopy(this.markdown);
    };
    
    smartCopy(markdown);
  }
  
  return results;
})();
