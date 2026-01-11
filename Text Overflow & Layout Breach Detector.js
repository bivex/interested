/**
 * Text Overflow & Layout Breach Detector
 * Finds text that overflows, gets cut off, or breaks layout boundaries
 * @param {Object} options - Configuration options
 */
(function detectTextOverflow(options) {
  'use strict';
  
  options = options || {};
  
  const config = {
    scanDepth: 'full',              // 'viewport' or 'full'
    includeHidden: false,
    checkHorizontal: true,          // Check horizontal overflow
    checkVertical: true,            // Check vertical overflow
    checkTruncation: true,          // Check text-overflow: ellipsis
    checkWordBreak: true,           // Check broken words
    checkZIndex: true,              // Check overlapping text
    minOverflow: 1,                 // Minimum overflow in pixels to report
    outputMarkdown: true,
    ...options
  };

  // ============================================================================
  // UTILITIES
  // ============================================================================
  
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
  
  function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           styles.display !== 'none' && 
           styles.visibility !== 'hidden' &&
           styles.opacity !== '0';
  }
  
  function getScrollParent(element) {
    let el = element.parentElement;
    
    while (el && el !== document.body) {
      const styles = getComputedStyle(el);
      const overflow = styles.overflow + styles.overflowX + styles.overflowY;
      
      if (/(auto|scroll)/.test(overflow)) {
        return el;
      }
      
      el = el.parentElement;
    }
    
    return document.documentElement;
  }
  
  function hasEllipsis(element) {
    const styles = getComputedStyle(element);
    return styles.textOverflow === 'ellipsis' && 
           styles.overflow === 'hidden' &&
           (styles.whiteSpace === 'nowrap' || styles.whiteSpace === 'pre');
  }
  
  function isTruncated(element) {
    // Check if element has text that's being cut off
    return element.scrollWidth > element.clientWidth || 
           element.scrollHeight > element.clientHeight;
  }
  
  function getOverflowAmount(element) {
    return {
      horizontal: Math.max(0, element.scrollWidth - element.clientWidth),
      vertical: Math.max(0, element.scrollHeight - element.clientHeight)
    };
  }

  // ============================================================================
  // DETECTION
  // ============================================================================
  
  const issues = [];
  const stats = {
    totalElements: 0,
    textElements: 0,
    horizontalOverflow: 0,
    verticalOverflow: 0,
    truncatedText: 0,
    brokenWords: 0,
    overlapping: 0,
    parentOverflow: 0
  };
  
  function detectOverlapping(element) {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    const zIndex = parseInt(styles.zIndex) || 0;
    
    // Check if element overlaps with siblings or goes outside parent
    const parent = element.parentElement;
    if (!parent) return null;
    
    const parentRect = parent.getBoundingClientRect();
    const parentStyles = getComputedStyle(parent);
    
    // Check if text goes outside parent bounds
    const outsideParent = {
      left: rect.left < parentRect.left,
      right: rect.right > parentRect.right,
      top: rect.top < parentRect.top,
      bottom: rect.bottom > parentRect.bottom
    };
    
    const isOutside = outsideParent.left || outsideParent.right || 
                      outsideParent.top || outsideParent.bottom;
    
    if (isOutside && parentStyles.overflow !== 'visible') {
      return {
        type: 'parent-boundary',
        details: outsideParent,
        overflow: {
          left: Math.max(0, parentRect.left - rect.left),
          right: Math.max(0, rect.right - parentRect.right),
          top: Math.max(0, parentRect.top - rect.top),
          bottom: Math.max(0, rect.bottom - parentRect.bottom)
        }
      };
    }
    
    // Check overlapping siblings
    const siblings = Array.from(parent.children).filter(el => el !== element);
    
    for (const sibling of siblings) {
      const sibRect = sibling.getBoundingClientRect();
      const sibStyles = getComputedStyle(sibling);
      const sibZIndex = parseInt(sibStyles.zIndex) || 0;
      
      // Check if rectangles overlap
      const overlap = !(
        rect.right < sibRect.left || 
        rect.left > sibRect.right || 
        rect.bottom < sibRect.top || 
        rect.top > sibRect.bottom
      );
      
      if (overlap) {
        // Calculate overlap area
        const overlapRect = {
          left: Math.max(rect.left, sibRect.left),
          right: Math.min(rect.right, sibRect.right),
          top: Math.max(rect.top, sibRect.top),
          bottom: Math.min(rect.bottom, sibRect.bottom)
        };
        
        const overlapArea = (overlapRect.right - overlapRect.left) * 
                           (overlapRect.bottom - overlapRect.top);
        
        // Only report if significant overlap (>10% of element area)
        const elementArea = rect.width * rect.height;
        if (overlapArea > elementArea * 0.1) {
          return {
            type: 'sibling-overlap',
            sibling: sibling,
            siblingSelector: getSelectorPath(sibling),
            zIndex: zIndex,
            siblingZIndex: sibZIndex,
            overlapArea: Math.round(overlapArea),
            overlapPercent: Math.round((overlapArea / elementArea) * 100)
          };
        }
      }
    }
    
    return null;
  }
  
  function checkWordBreaking(element) {
    const styles = getComputedStyle(element);
    const text = element.textContent.trim();
    
    if (!text) return null;
    
    const words = text.split(/\s+/);
    const longWords = words.filter(word => word.length > 20);
    
    if (longWords.length === 0) return null;
    
    // Check if word-break or overflow-wrap is set
    const hasWordBreak = styles.wordBreak !== 'normal';
    const hasOverflowWrap = styles.overflowWrap !== 'normal';
    
    // Check if container is narrow
    const containerWidth = element.clientWidth;
    const avgCharWidth = 10; // approximate
    
    const problematicWords = longWords.filter(word => {
      return word.length * avgCharWidth > containerWidth;
    });
    
    if (problematicWords.length > 0 && !hasWordBreak && !hasOverflowWrap) {
      return {
        words: problematicWords,
        containerWidth: containerWidth,
        hasWordBreak: hasWordBreak,
        hasOverflowWrap: hasOverflowWrap
      };
    }
    
    return null;
  }
  
  function analyzeElement(element) {
    stats.totalElements++;
    
    const text = element.textContent.trim();
    if (!text || text.length === 0) return;
    
    if (!isElementVisible(element)) {
      if (!config.includeHidden) return;
    }
    
    stats.textElements++;
    
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const overflow = getOverflowAmount(element);
    
    const elementIssues = [];
    
    // ========================================================================
    // 1. HORIZONTAL OVERFLOW
    // ========================================================================
    
    if (config.checkHorizontal && overflow.horizontal >= config.minOverflow) {
      const scrollParent = getScrollParent(element);
      const canScroll = scrollParent !== document.documentElement;
      
      elementIssues.push({
        type: 'horizontal-overflow',
        severity: canScroll ? 'warning' : 'critical',
        message: 'Text overflows horizontally by ' + overflow.horizontal + 'px',
        overflow: overflow.horizontal,
        canScroll: canScroll,
        scrollParent: canScroll ? getSelectorPath(scrollParent) : null,
        whiteSpace: styles.whiteSpace,
        overflowX: styles.overflowX
      });
      
      stats.horizontalOverflow++;
    }
    
    // ========================================================================
    // 2. VERTICAL OVERFLOW
    // ========================================================================
    
    if (config.checkVertical && overflow.vertical >= config.minOverflow) {
      const maxHeight = styles.maxHeight;
      const height = styles.height;
      
      elementIssues.push({
        type: 'vertical-overflow',
        severity: 'warning',
        message: 'Text overflows vertically by ' + overflow.vertical + 'px',
        overflow: overflow.vertical,
        maxHeight: maxHeight,
        height: height,
        overflowY: styles.overflowY
      });
      
      stats.verticalOverflow++;
    }
    
    // ========================================================================
    // 3. TEXT TRUNCATION (ellipsis)
    // ========================================================================
    
    if (config.checkTruncation && hasEllipsis(element) && isTruncated(element)) {
      elementIssues.push({
        type: 'text-truncated',
        severity: 'info',
        message: 'Text is truncated with ellipsis',
        hiddenContent: overflow.horizontal + 'px hidden',
        fullText: text.substring(0, 100)
      });
      
      stats.truncatedText++;
    }
    
    // ========================================================================
    // 4. WORD BREAKING
    // ========================================================================
    
    if (config.checkWordBreak) {
      const wordBreakIssue = checkWordBreaking(element);
      
      if (wordBreakIssue) {
        elementIssues.push({
          type: 'word-break-issue',
          severity: 'warning',
          message: 'Long words may break layout (' + wordBreakIssue.words.length + ' words)',
          words: wordBreakIssue.words.slice(0, 3),
          containerWidth: wordBreakIssue.containerWidth,
          currentWordBreak: styles.wordBreak,
          currentOverflowWrap: styles.overflowWrap
        });
        
        stats.brokenWords++;
      }
    }
    
    // ========================================================================
    // 5. OVERLAPPING / OUTSIDE PARENT
    // ========================================================================
    
    if (config.checkZIndex) {
      const overlapIssue = detectOverlapping(element);
      
      if (overlapIssue) {
        if (overlapIssue.type === 'parent-boundary') {
          elementIssues.push({
            type: 'outside-parent',
            severity: 'critical',
            message: 'Text extends outside parent boundaries',
            overflow: overlapIssue.overflow,
            details: overlapIssue.details
          });
          
          stats.parentOverflow++;
        } else if (overlapIssue.type === 'sibling-overlap') {
          elementIssues.push({
            type: 'overlapping-sibling',
            severity: 'warning',
            message: 'Text overlaps with sibling element',
            sibling: overlapIssue.siblingSelector,
            overlapPercent: overlapIssue.overlapPercent,
            zIndex: overlapIssue.zIndex,
            siblingZIndex: overlapIssue.siblingZIndex
          });
          
          stats.overlapping++;
        }
      }
    }
    
    // ========================================================================
    // STORE ISSUES
    // ========================================================================
    
    if (elementIssues.length > 0) {
      issues.push({
        element: element,
        selector: getSelectorPath(element),
        tag: element.tagName.toLowerCase(),
        text: text.substring(0, 80),
        dimensions: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight
        },
        position: {
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        },
        styles: {
          overflow: styles.overflow,
          overflowX: styles.overflowX,
          overflowY: styles.overflowY,
          whiteSpace: styles.whiteSpace,
          wordBreak: styles.wordBreak,
          overflowWrap: styles.overflowWrap,
          textOverflow: styles.textOverflow
        },
        issues: elementIssues
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
  
  console.log('🔍 Scanning ' + elements.length + ' elements for overflow issues...');
  
  elements.forEach(analyzeElement);
  
  // Sort by severity
  issues.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const aSeverity = Math.min(...a.issues.map(i => severityOrder[i.severity]));
    const bSeverity = Math.min(...b.issues.map(i => severityOrder[i.severity]));
    return aSeverity - bSeverity;
  });

  // ============================================================================
  // RESULTS
  // ============================================================================
  
  const results = {
    issues: issues,
    stats: stats
  };

  // ============================================================================
  // MARKDOWN GENERATION
  // ============================================================================
  
  function generateMarkdown() {
    let md = '# Text Overflow & Layout Breach Report\n\n';
    md += '**Website:** `' + window.location.hostname + '`\n\n';
    
    md += '## Summary\n\n';
    md += '- Total elements scanned: ' + stats.totalElements + '\n';
    md += '- Text elements: ' + stats.textElements + '\n';
    md += '- **Total issues: ' + issues.length + '**\n';
    md += '  - Horizontal overflow: ' + stats.horizontalOverflow + '\n';
    md += '  - Vertical overflow: ' + stats.verticalOverflow + '\n';
    md += '  - Truncated text: ' + stats.truncatedText + '\n';
    md += '  - Word break issues: ' + stats.brokenWords + '\n';
    md += '  - Outside parent: ' + stats.parentOverflow + '\n';
    md += '  - Overlapping siblings: ' + stats.overlapping + '\n\n';
    md += '---\n\n';
    
    if (issues.length === 0) {
      md += '## ✅ No Overflow Issues Found!\n\n';
      md += 'All text elements are properly contained within their boundaries.\n';
      return md;
    }
    
    md += '## Issues\n\n';
    
    const severityIcons = {
      critical: '🔴',
      warning: '🟡',
      info: 'ℹ️'
    };
    
    issues.forEach((issue, index) => {
      const maxSeverity = issue.issues.reduce((max, i) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[i.severity] < order[max] ? i.severity : max;
      }, 'info');
      
      const icon = severityIcons[maxSeverity];
      
      md += '### ' + icon + ' Issue #' + (index + 1) + ' - `' + issue.selector + '`\n\n';
      
      md += '**Element:** `<' + issue.tag + '>`\n\n';
      md += '**Text preview:** "' + issue.text + '..."\n\n';
      md += '**Position:** top: ' + issue.position.top + 'px, left: ' + issue.position.left + 'px\n\n';
      
      md += '| Property | Value |\n';
      md += '|----------|-------|\n';
      md += '| Width | ' + issue.dimensions.width + 'px |\n';
      md += '| Height | ' + issue.dimensions.height + 'px |\n';
      md += '| Scroll Width | ' + issue.dimensions.scrollWidth + 'px |\n';
      md += '| Scroll Height | ' + issue.dimensions.scrollHeight + 'px |\n';
      md += '| Overflow | `' + issue.styles.overflow + '` |\n';
      md += '| White Space | `' + issue.styles.whiteSpace + '` |\n';
      md += '| Word Break | `' + issue.styles.wordBreak + '` |\n\n';
      
      md += '**Problems:**\n';
      issue.issues.forEach(i => {
        const iIcon = severityIcons[i.severity];
        md += '- ' + iIcon + ' **' + i.message + '**\n';
        
        if (i.type === 'horizontal-overflow') {
          md += '  - Overflow: ' + i.overflow + 'px\n';
          md += '  - Can scroll: ' + (i.canScroll ? 'Yes' : 'No') + '\n';
        } else if (i.type === 'vertical-overflow') {
          md += '  - Overflow: ' + i.overflow + 'px\n';
        } else if (i.type === 'word-break-issue') {
          md += '  - Problematic words: `' + i.words.join('`, `') + '`\n';
          md += '  - Container width: ' + i.containerWidth + 'px\n';
        } else if (i.type === 'outside-parent') {
          md += '  - Overflow: ' + JSON.stringify(i.overflow) + '\n';
        } else if (i.type === 'overlapping-sibling') {
          md += '  - Overlaps with: `' + i.sibling + '`\n';
          md += '  - Overlap: ' + i.overlapPercent + '%\n';
        }
      });
      md += '\n';
      
      md += '**Suggested Fixes:**\n';
      md += '```css\n';
      md += issue.selector + ' {\n';
      
      issue.issues.forEach(i => {
        if (i.type === 'horizontal-overflow') {
          md += '  /* Fix horizontal overflow */\n';
          md += '  overflow-x: auto; /* Allow scrolling */\n';
          md += '  /* OR */\n';
          md += '  white-space: normal; /* Allow wrapping */\n';
          md += '  word-wrap: break-word;\n';
        } else if (i.type === 'vertical-overflow') {
          md += '  /* Fix vertical overflow */\n';
          md += '  overflow-y: auto; /* Allow scrolling */\n';
          md += '  /* OR */\n';
          md += '  max-height: none; /* Remove height restriction */\n';
        } else if (i.type === 'word-break-issue') {
          md += '  /* Fix long words */\n';
          md += '  word-break: break-word;\n';
          md += '  overflow-wrap: break-word;\n';
        } else if (i.type === 'outside-parent') {
          md += '  /* Fix boundary breach */\n';
          md += '  max-width: 100%;\n';
          md += '  box-sizing: border-box;\n';
        } else if (i.type === 'overlapping-sibling') {
          md += '  /* Fix overlap */\n';
          md += '  z-index: ' + (i.siblingZIndex + 1) + ';\n';
          md += '  /* OR adjust positioning/margins */\n';
        }
      });
      
      md += '}\n```\n\n';
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
          console.log('📋 Overflow report copied to clipboard!');
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
  
  console.group('👁️ Text Overflow Detection');
  console.log('Elements scanned:', stats.totalElements);
  console.log('Text elements:', stats.textElements);
  console.log('Issues found:', issues.length);
  console.log('  🔴 Horizontal overflow:', stats.horizontalOverflow);
  console.log('  🔴 Vertical overflow:', stats.verticalOverflow);
  console.log('  ℹ️ Truncated text:', stats.truncatedText);
  console.log('  🟡 Word breaks:', stats.brokenWords);
  console.log('  🔴 Outside parent:', stats.parentOverflow);
  console.log('  🟡 Overlapping:', stats.overlapping);
  
  if (issues.length > 0) {
    console.group('📋 Issues');
    issues.forEach((issue, i) => {
      console.group((i + 1) + '. ' + issue.selector);
      console.log('Element:', issue.element);
      console.log('Dimensions:', issue.dimensions);
      issue.issues.forEach(iss => {
        const icon = iss.severity === 'critical' ? '🔴' : iss.severity === 'warning' ? '🟡' : 'ℹ️';
        console.log(icon + ' ' + iss.message);
      });
      console.groupEnd();
    });
    console.groupEnd();
  }
  
  console.groupEnd();
  
  // ============================================================================
  // HIGHLIGHT ISSUES
  // ============================================================================
  
  results.highlight = function(type) {
    const colorsMap = {
      'horizontal-overflow': 'red',
      'vertical-overflow': 'orange',
      'text-truncated': 'blue',
      'word-break-issue': 'purple',
      'outside-parent': 'darkred',
      'overlapping-sibling': 'magenta'
    };
    
    issues.forEach(issue => {
      const issueTypes = issue.issues.map(i => i.type);
      
      // If type filter is specified, only highlight that type
      if (type && !issueTypes.includes(type)) return;
      
      const color = type ? colorsMap[type] : (
        issueTypes.includes('horizontal-overflow') ? 'red' :
        issueTypes.includes('outside-parent') ? 'darkred' : 'orange'
      );
      
      issue.element.style.outline = '3px solid ' + color;
      issue.element.style.outlineOffset = '2px';
      issue.element.title = issue.issues.map(i => i.message).join('; ');
    });
    
    console.log('🎨 Highlighted ' + issues.length + ' elements with overflow issues');
  };
  
  results.removeHighlight = function() {
    issues.forEach(issue => {
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
  
  return results;
})();
