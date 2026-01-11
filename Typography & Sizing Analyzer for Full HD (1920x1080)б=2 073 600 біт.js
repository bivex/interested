/**
 * Typography & Sizing Analyzer for Full HD (1920x1080)
 * Analyzes font sizes, line heights, spacing and readability metrics
 * @param {Object} options - Configuration options
 */
(function analyzeTypography(options) {
  'use strict';
  
  options = options || {};
  
  const config = {
    screenWidth: 1920,
    screenHeight: 1080,
    scanDepth: 'full',              // 'viewport' or 'full'
    includeHidden: false,
    minTextLength: 20,              // Min chars to analyze readability
    outputMarkdown: true,
    ...options
  };

  // ============================================================================
  // TYPOGRAPHY STANDARDS & BEST PRACTICES
  // ============================================================================
  
  const standards = {
    // Optimal reading line length (45-75 characters is ideal)
    lineLength: {
      min: 45,
      ideal: 66,
      max: 90
    },
    // Line height recommendations
    lineHeight: {
      body: { min: 1.4, ideal: 1.6, max: 2 },
      heading: { min: 1.2, ideal: 1.3, max: 1.5 }
    },
    // Font size recommendations for Full HD
    fontSize: {
      min: 16,      // Minimum readable
      body: 18,     // Ideal body text
      large: 20,    // Large body text
      h6: 20,
      h5: 24,
      h4: 30,
      h3: 36,
      h2: 48,
      h1: 60
    },
    // Letter spacing
    letterSpacing: {
      tight: -0.05,
      normal: 0,
      loose: 0.1
    },
    // Paragraph spacing
    paragraphSpacing: {
      min: 0.5,     // em units
      ideal: 1,
      max: 2
    }
  };

  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  function parseUnit(value) {
    const match = String(value).match(/^([0-9.]+)([a-z%]*)/i);
    return match ? { value: parseFloat(match[1]), unit: match[2] || 'px' } : { value: 0, unit: 'px' };
  }
  
  function pxToRem(px) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return (px / rootFontSize).toFixed(3);
  }
  
  function getTextContent(element) {
    // Get only direct text, not nested elements
    return Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join(' ')
      .trim();
  }
  
  function countCharactersPerLine(element) {
    const text = element.textContent.trim();
    if (!text) return 0;
    
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    const elementHeight = element.offsetHeight;
    const lines = Math.max(1, Math.round(elementHeight / lineHeight));
    
    return Math.round(text.length / lines);
  }
  
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
  
  function isHeading(element) {
    return /^H[1-6]$/i.test(element.tagName);
  }
  
  function getHeadingLevel(element) {
    return isHeading(element) ? parseInt(element.tagName[1]) : null;
  }

  // ============================================================================
  // ANALYSIS
  // ============================================================================
  
  const results = {
    fonts: new Map(),           // font-family -> usage count
    fontSizes: new Map(),       // size -> usage count
    lineHeights: new Map(),     // line-height -> usage count
    issues: [],
    stats: {
      totalElements: 0,
      textElements: 0,
      headings: 0,
      paragraphs: 0,
      tooSmall: 0,
      tooLarge: 0,
      poorLineHeight: 0,
      poorLineLength: 0,
      poorSpacing: 0
    }
  };
  
  function analyzeElement(element) {
    results.stats.totalElements++;
    
    const text = element.textContent.trim();
    if (!text || text.length === 0) return;
    
    // Skip if not visible
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const styles = getComputedStyle(element);
    
    // Skip hidden elements
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      if (!config.includeHidden) return;
    }
    
    results.stats.textElements++;
    
    // Extract typography properties
    const fontFamily = styles.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight);
    const letterSpacing = parseFloat(styles.letterSpacing) || 0;
    const fontWeight = parseInt(styles.fontWeight) || 400;
    const textAlign = styles.textAlign;
    const marginBottom = parseFloat(styles.marginBottom);
    const paddingTop = parseFloat(styles.paddingTop);
    const paddingBottom = parseFloat(styles.paddingBottom);
    
    const isH = isHeading(element);
    const hLevel = getHeadingLevel(element);
    const isParagraph = element.tagName === 'P';
    
    if (isH) results.stats.headings++;
    if (isParagraph) results.stats.paragraphs++;
    
    // Track font usage
    if (!results.fonts.has(fontFamily)) {
      results.fonts.set(fontFamily, { count: 0, elements: [] });
    }
    results.fonts.get(fontFamily).count++;
    results.fonts.get(fontFamily).elements.push(element);
    
    // Track font sizes
    const sizeKey = fontSize + 'px';
    if (!results.fontSizes.has(sizeKey)) {
      results.fontSizes.set(sizeKey, { count: 0, rem: pxToRem(fontSize) });
    }
    results.fontSizes.get(sizeKey).count++;
    
    // Track line heights
    const lhRatio = (lineHeight / fontSize).toFixed(2);
    if (!results.lineHeights.has(lhRatio)) {
      results.lineHeights.set(lhRatio, 0);
    }
    results.lineHeights.set(lhRatio, results.lineHeights.get(lhRatio) + 1);
    
    // Calculate line length in characters
    const charsPerLine = countCharactersPerLine(element);
    
    // ========================================================================
    // ISSUE DETECTION
    // ========================================================================
    
    const issues = [];
    
    // Check font size
    if (fontSize < standards.fontSize.min) {
      issues.push({
        type: 'font-size-too-small',
        severity: 'critical',
        message: 'Font size too small (' + fontSize + 'px < ' + standards.fontSize.min + 'px)',
        current: fontSize + 'px',
        recommended: standards.fontSize.body + 'px'
      });
      results.stats.tooSmall++;
    }
    
    if (!isH && fontSize > 32) {
      issues.push({
        type: 'font-size-too-large',
        severity: 'warning',
        message: 'Body text unusually large (' + fontSize + 'px)',
        current: fontSize + 'px',
        recommended: standards.fontSize.body + 'px'
      });
      results.stats.tooLarge++;
    }
    
    // Check heading sizes
    if (isH) {
      const expectedSize = standards.fontSize['h' + hLevel];
      if (fontSize < expectedSize * 0.7) {
        issues.push({
          type: 'heading-too-small',
          severity: 'warning',
          message: 'H' + hLevel + ' too small (' + fontSize + 'px, expected ~' + expectedSize + 'px)',
          current: fontSize + 'px',
          recommended: expectedSize + 'px'
        });
      }
    }
    
    // Check line height
    const lhStandard = isH ? standards.lineHeight.heading : standards.lineHeight.body;
    const lhRatioNum = parseFloat(lhRatio);
    
    if (lhRatioNum < lhStandard.min) {
      issues.push({
        type: 'line-height-too-tight',
        severity: 'critical',
        message: 'Line height too tight (' + lhRatio + ' < ' + lhStandard.min + ')',
        current: lhRatio,
        recommended: lhStandard.ideal
      });
      results.stats.poorLineHeight++;
    } else if (lhRatioNum > lhStandard.max) {
      issues.push({
        type: 'line-height-too-loose',
        severity: 'warning',
        message: 'Line height too loose (' + lhRatio + ' > ' + lhStandard.max + ')',
        current: lhRatio,
        recommended: lhStandard.ideal
      });
      results.stats.poorLineHeight++;
    }
    
    // Check line length for paragraphs and long text
    if (text.length > config.minTextLength && charsPerLine > 0) {
      if (charsPerLine < standards.lineLength.min) {
        issues.push({
          type: 'line-length-too-short',
          severity: 'warning',
          message: 'Lines too short (' + charsPerLine + ' chars < ' + standards.lineLength.min + ')',
          current: charsPerLine + ' chars',
          recommended: standards.lineLength.ideal + ' chars'
        });
        results.stats.poorLineLength++;
      } else if (charsPerLine > standards.lineLength.max) {
        issues.push({
          type: 'line-length-too-long',
          severity: 'critical',
          message: 'Lines too long (' + charsPerLine + ' chars > ' + standards.lineLength.max + ')',
          current: charsPerLine + ' chars',
          recommended: standards.lineLength.ideal + ' chars'
        });
        results.stats.poorLineLength++;
      }
    }
    
    // Check paragraph spacing
    if (isParagraph && marginBottom > 0) {
      const spacingEm = marginBottom / fontSize;
      if (spacingEm < standards.paragraphSpacing.min) {
        issues.push({
          type: 'paragraph-spacing-too-tight',
          severity: 'warning',
          message: 'Paragraph spacing too tight (' + spacingEm.toFixed(2) + 'em)',
          current: spacingEm.toFixed(2) + 'em',
          recommended: standards.paragraphSpacing.ideal + 'em'
        });
        results.stats.poorSpacing++;
      }
    }
    
    // Check letter spacing extremes
    const letterSpacingEm = letterSpacing / fontSize;
    if (letterSpacingEm < -0.1) {
      issues.push({
        type: 'letter-spacing-too-tight',
        severity: 'warning',
        message: 'Letter spacing very tight',
        current: letterSpacingEm.toFixed(3) + 'em',
        recommended: '0em'
      });
    } else if (letterSpacingEm > 0.2) {
      issues.push({
        type: 'letter-spacing-too-loose',
        severity: 'warning',
        message: 'Letter spacing very loose',
        current: letterSpacingEm.toFixed(3) + 'em',
        recommended: '0em - 0.05em'
      });
    }
    
    // Store issues
    if (issues.length > 0) {
      results.issues.push({
        element: element,
        selector: getSelectorPath(element),
        tag: element.tagName.toLowerCase(),
        text: text.substring(0, 60),
        properties: {
          fontFamily: fontFamily,
          fontSize: fontSize + 'px (' + pxToRem(fontSize) + 'rem)',
          lineHeight: lhRatio,
          letterSpacing: letterSpacingEm.toFixed(3) + 'em',
          fontWeight: fontWeight,
          charsPerLine: charsPerLine,
          marginBottom: marginBottom + 'px',
          textAlign: textAlign
        },
        issues: issues
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
  
  console.log('🔍 Analyzing typography for ' + elements.length + ' elements...');
  
  elements.forEach(analyzeElement);

  // ============================================================================
  // FONT ANALYSIS
  // ============================================================================
  
  const fontStats = Array.from(results.fonts.entries())
    .map(([name, data]) => ({ name: name, count: data.count }))
    .sort((a, b) => b.count - a.count);
  
  const sizeStats = Array.from(results.fontSizes.entries())
    .map(([size, data]) => ({ size: size, rem: data.rem, count: data.count }))
    .sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  
  const lineHeightStats = Array.from(results.lineHeights.entries())
    .map(([ratio, count]) => ({ ratio: ratio, count: count }))
    .sort((a, b) => b.count - a.count);

  // ============================================================================
  // MARKDOWN GENERATION
  // ============================================================================
  
  function generateMarkdown() {
    let md = '# Typography Analysis Report (Full HD: 1920×1080)\n\n';
    md += '**Website:** `' + window.location.hostname + '`\n\n';
    
    md += '## Summary\n\n';
    md += '- Total elements scanned: ' + results.stats.totalElements + '\n';
    md += '- Text elements: ' + results.stats.textElements + '\n';
    md += '- Headings: ' + results.stats.headings + '\n';
    md += '- Paragraphs: ' + results.stats.paragraphs + '\n';
    md += '- **Issues found: ' + results.issues.length + '**\n';
    md += '  - Font size issues: ' + (results.stats.tooSmall + results.stats.tooLarge) + '\n';
    md += '  - Line height issues: ' + results.stats.poorLineHeight + '\n';
    md += '  - Line length issues: ' + results.stats.poorLineLength + '\n';
    md += '  - Spacing issues: ' + results.stats.poorSpacing + '\n\n';
    md += '---\n\n';
    
    // Font families
    md += '## Font Families\n\n';
    md += '| Font Family | Usage Count |\n';
    md += '|-------------|-------------|\n';
    fontStats.forEach(font => {
      md += '| `' + font.name + '` | ' + font.count + ' |\n';
    });
    md += '\n';
    
    // Font sizes
    md += '## Font Size Distribution\n\n';
    md += '| Size (px) | Size (rem) | Usage Count | Status |\n';
    md += '|-----------|------------|-------------|--------|\n';
    sizeStats.forEach(size => {
      const px = parseFloat(size.size);
      let status = '✅ Good';
      if (px < standards.fontSize.min) status = '❌ Too Small';
      else if (px < standards.fontSize.body) status = '⚠️ Small';
      else if (px > 32 && px < 40) status = '⚠️ Large';
      
      md += '| ' + size.size + ' | ' + size.rem + 'rem | ' + size.count + ' | ' + status + ' |\n';
    });
    md += '\n';
    
    // Line heights
    md += '## Line Height Ratios\n\n';
    md += '| Ratio | Usage Count | Status |\n';
    md += '|-------|-------------|--------|\n';
    lineHeightStats.forEach(lh => {
      const ratio = parseFloat(lh.ratio);
      let status = '✅ Good';
      if (ratio < 1.4) status = '❌ Too Tight';
      else if (ratio > 2) status = '⚠️ Too Loose';
      
      md += '| ' + lh.ratio + ' | ' + lh.count + ' | ' + status + ' |\n';
    });
    md += '\n';
    
    if (results.issues.length === 0) {
      md += '## ✅ No Typography Issues Found!\n\n';
      md += 'All text elements follow best practices for Full HD displays.\n';
      return md;
    }
    
    // Issues
    md += '## Issues\n\n';
    
    results.issues.forEach((issue, index) => {
      const criticalCount = issue.issues.filter(i => i.severity === 'critical').length;
      const icon = criticalCount > 0 ? '🔴' : '🟡';
      
      md += '### ' + icon + ' Issue #' + (index + 1) + ' - `' + issue.selector + '`\n\n';
      md += '**Element:** `<' + issue.tag + '>`\n\n';
      md += '**Text:** "' + issue.text + '..."\n\n';
      
      md += '**Current Properties:**\n';
      md += '```css\n';
      md += 'font-family: ' + issue.properties.fontFamily + ';\n';
      md += 'font-size: ' + issue.properties.fontSize + ';\n';
      md += 'font-weight: ' + issue.properties.fontWeight + ';\n';
      md += 'line-height: ' + issue.properties.lineHeight + ';\n';
      md += 'letter-spacing: ' + issue.properties.letterSpacing + ';\n';
      if (issue.properties.charsPerLine > 0) {
        md += '/* Characters per line: ~' + issue.properties.charsPerLine + ' */\n';
      }
      md += '```\n\n';
      
      md += '**Problems:**\n';
      issue.issues.forEach(i => {
        const severityIcon = i.severity === 'critical' ? '🔴' : '🟡';
        md += '- ' + severityIcon + ' **' + i.message + '**\n';
        md += '  - Current: `' + i.current + '`\n';
        md += '  - Recommended: `' + i.recommended + '`\n';
      });
      md += '\n';
      
      md += '**Suggested Fix:**\n';
      md += '```css\n';
      md += issue.selector + ' {\n';
      
      issue.issues.forEach(i => {
        if (i.type.includes('font-size')) {
          md += '  font-size: ' + i.recommended + ';\n';
        } else if (i.type.includes('line-height')) {
          md += '  line-height: ' + i.recommended + ';\n';
        } else if (i.type.includes('line-length')) {
          md += '  max-width: 75ch; /* Limit line length */\n';
        } else if (i.type.includes('paragraph-spacing')) {
          md += '  margin-bottom: ' + i.recommended + ';\n';
        } else if (i.type.includes('letter-spacing')) {
          md += '  letter-spacing: 0em;\n';
        }
      });
      
      md += '}\n```\n\n';
      md += '---\n\n';
    });
    
    // Recommendations
    md += '## Recommendations for Full HD (1920×1080)\n\n';
    md += '### Optimal Font Sizes\n';
    md += '```css\n';
    md += 'body { font-size: ' + standards.fontSize.body + 'px; } /* ' + pxToRem(standards.fontSize.body) + 'rem */\n';
    md += 'h1 { font-size: ' + standards.fontSize.h1 + 'px; }\n';
    md += 'h2 { font-size: ' + standards.fontSize.h2 + 'px; }\n';
    md += 'h3 { font-size: ' + standards.fontSize.h3 + 'px; }\n';
    md += 'h4 { font-size: ' + standards.fontSize.h4 + 'px; }\n';
    md += '```\n\n';
    
    md += '### Line Height\n';
    md += '- Body text: 1.6 (or 1.5-1.8)\n';
    md += '- Headings: 1.2-1.3\n\n';
    
    md += '### Line Length\n';
    md += '- Ideal: 66 characters (~45-75 range)\n';
    md += '- Use `max-width: 75ch` on paragraphs\n\n';
    
    return md;
  }

  // ============================================================================
  // SMART CLIPBOARD COPY
  // ============================================================================
  
  function smartCopy(text) {
    if (document.hasFocus()) {
      return navigator.clipboard.writeText(text)
        .then(() => {
          console.log('📋 Typography report copied to clipboard!');
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
  
  console.group('📐 Typography Analysis (Full HD)');
  console.log('Elements analyzed:', results.stats.textElements);
  console.log('Issues found:', results.issues.length);
  console.log('  Font size issues:', results.stats.tooSmall + results.stats.tooLarge);
  console.log('  Line height issues:', results.stats.poorLineHeight);
  console.log('  Line length issues:', results.stats.poorLineLength);
  
  console.group('🔤 Font Families (' + fontStats.length + ')');
  fontStats.forEach(font => {
    console.log(font.name + ': ' + font.count + ' elements');
  });
  console.groupEnd();
  
  console.group('📏 Font Sizes (Top 10)');
  sizeStats.slice(0, 10).forEach(size => {
    console.log(size.size + ' (' + size.rem + 'rem): ' + size.count + ' elements');
  });
  console.groupEnd();
  
  if (results.issues.length > 0) {
    console.group('⚠️ Issues');
    results.issues.forEach((issue, i) => {
      console.group((i + 1) + '. ' + issue.selector);
      console.log('Element:', issue.element);
      issue.issues.forEach(i => {
        console.log((i.severity === 'critical' ? '🔴' : '🟡') + ' ' + i.message);
      });
      console.groupEnd();
    });
    console.groupEnd();
  }
  
  console.groupEnd();
  
  // ============================================================================
  // HIGHLIGHT ISSUES
  // ============================================================================
  
  results.highlight = function() {
    results.issues.forEach(issue => {
      const hasCritical = issue.issues.some(i => i.severity === 'critical');
      issue.element.style.outline = hasCritical ? '3px solid red' : '2px solid orange';
      issue.element.style.outlineOffset = '2px';
      issue.element.title = issue.issues.map(i => i.message).join('; ');
    });
    console.log('🎨 Highlighted ' + results.issues.length + ' elements with typography issues');
  };
  
  results.removeHighlight = function() {
    results.issues.forEach(issue => {
      issue.element.style.outline = '';
      issue.element.style.outlineOffset = '';
      issue.element.title = '';
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
  
  // Add helpful data
  results.fonts = fontStats;
  results.sizes = sizeStats;
  results.lineHeights = lineHeightStats;
  
  return results;
})();
