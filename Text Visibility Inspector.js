/**
 * Text Visibility Inspector
 * Finds text that overflows (goes outside bounds) OR is completely hidden/cut off
 * @param {Object} options - Configuration options
 */
(function detectTextVisibility(options) {
  'use strict';
  
  options = options || {};
  
  const config = {
    scanDepth: 'full',              // 'viewport' or 'full'
    includeHidden: false,
    checkOverflow: true,            // Text goes outside container
    checkHidden: true,              // Text is completely hidden
    checkPartiallyHidden: true,     // Text is partially cut off
    checkClipped: true,             // Text clipped by overflow:hidden
    checkOffscreen: true,           // Text positioned off-screen
    minOverflow: 1,                 // Minimum overflow in pixels
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
  
  function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  function isElementOffScreen(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return {
      completelyAbove: rect.bottom < 0,
      completelyBelow: rect.top > windowHeight,
      completelyLeft: rect.right < 0,
      completelyRight: rect.left > windowWidth,
      isOffscreen: function() {
        return this.completelyAbove || this.completelyBelow || 
               this.completelyLeft || this.completelyRight;
      }
    };
  }
  
  function getVisibilityState(element) {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    
    // Check CSS visibility
    if (styles.display === 'none') return 'display-none';
    if (styles.visibility === 'hidden') return 'visibility-hidden';
    if (parseFloat(styles.opacity) === 0) return 'opacity-zero';
    
    // Check dimensions
    if (rect.width === 0 && rect.height === 0) return 'zero-dimensions';
    if (rect.width === 0) return 'zero-width';
    if (rect.height === 0) return 'zero-height';
    
    // Check if clipped
    if (styles.clip !== 'auto' && styles.clip !== 'rect(auto, auto, auto, auto)') {
      return 'css-clip';
    }
    
    if (styles.clipPath && styles.clipPath !== 'none') {
      return 'clip-path';
    }
    
    // Check text-indent hiding technique
    const textIndent = parseFloat(styles.textIndent);
    if (textIndent < -9000) return 'text-indent-hidden';
    
    return 'visible';
  }
  
  function isClippedByParent(element) {
    let el = element;
    const elementRect = element.getBoundingClientRect();
    
    while (el.parentElement && el.parentElement !== document.body) {
      const parent = el.parentElement;
      const parentStyles = getComputedStyle(parent);
      
      // Check if parent clips overflow
      if (parentStyles.overflow === 'hidden' || 
          parentStyles.overflowX === 'hidden' || 
          parentStyles.overflowY === 'hidden') {
        
        const parentRect = parent.getBoundingClientRect();
        
        // Calculate how much is clipped
        const clipped = {
          top: Math.max(0, parentRect.top - elementRect.top),
          bottom: Math.max(0, elementRect.bottom - parentRect.bottom),
          left: Math.max(0, parentRect.left - elementRect.left),
          right: Math.max(0, elementRect.right - parentRect.right)
        };
        
        const isClipped = clipped.top > 0 || clipped.bottom > 0 || 
                         clipped.left > 0 || clipped.right > 0;
        
        if (isClipped) {
          // Check if COMPLETELY clipped
          const completelyClipped = 
            (clipped.top >= elementRect.height) ||
            (clipped.bottom >= elementRect.height) ||
            (clipped.left >= elementRect.width) ||
            (clipped.right >= elementRect.width);
          
          return {
            isClipped: true,
            completelyClipped: completelyClipped,
            parent: parent,
            parentSelector: getSelectorPath(parent),
            clippedAmount: clipped,
            visiblePercentage: completelyClipped ? 0 : Math.round(
              ((elementRect.width - clipped.left - clipped.right) * 
               (elementRect.height - clipped.top - clipped.bottom)) / 
              (elementRect.width * elementRect.height) * 100
            )
          };
        }
      }
      
      el = parent;
    }
    
    return null;
  }
  
  function getOverflowInfo(element) {
    const scrollWidth = element.scrollWidth;
    const scrollHeight = element.scrollHeight;
    const clientWidth = element.clientWidth;
    const clientHeight = element.clientHeight;
    
    const overflowX = scrollWidth - clientWidth;
    const overflowY = scrollHeight - clientHeight;
    
    return {
      hasOverflow: overflowX > 0 || overflowY > 0,
      horizontal: Math.max(0, overflowX),
      vertical: Math.max(0, overflowY),
      horizontalPercent: clientWidth > 0 ? Math.round((overflowX / scrollWidth) * 100) : 0,
      verticalPercent: clientHeight > 0 ? Math.round((overflowY / scrollHeight) * 100) : 0
    };
  }

  // ============================================================================
  // DETECTION
  // ============================================================================
  
  const issues = [];
  const stats = {
    totalElements: 0,
    textElements: 0,
    overflow: 0,              // Text goes outside
    completelyHidden: 0,      // Text not visible at all
    partiallyHidden: 0,       // Text partially cut off
    clipped: 0,               // Clipped by parent overflow
    offscreen: 0              // Positioned off-screen
  };
  
  function analyzeElement(element) {
    stats.totalElements++;
    
    const text = element.textContent.trim();
    if (!text || text.length === 0) return;
    
    stats.textElements++;
    
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    const visibilityState = getVisibilityState(element);
    
    const elementIssues = [];
    
    // ========================================================================
    // 1. COMPLETELY HIDDEN TEXT
    // ========================================================================
    
    if (config.checkHidden && visibilityState !== 'visible') {
      let severity = 'critical';
      let message = '';
      
      switch (visibilityState) {
        case 'display-none':
          message = 'Text hidden with display: none';
          break;
        case 'visibility-hidden':
          message = 'Text hidden with visibility: hidden';
          break;
        case 'opacity-zero':
          message = 'Text hidden with opacity: 0';
          break;
        case 'zero-dimensions':
          message = 'Element has zero width and height';
          break;
        case 'zero-width':
          message = 'Element has zero width';
          break;
        case 'zero-height':
          message = 'Element has zero height';
          break;
        case 'css-clip':
          message = 'Text clipped with CSS clip property';
          break;
        case 'clip-path':
          message = 'Text hidden with clip-path';
          break;
        case 'text-indent-hidden':
          message = 'Text hidden with text-indent: -9999px';
          severity = 'info'; // Sometimes intentional for accessibility
          break;
      }
      
      elementIssues.push({
        type: 'completely-hidden',
        severity: severity,
        message: message,
        method: visibilityState,
        intentional: visibilityState === 'text-indent-hidden'
      });
      
      stats.completelyHidden++;
    }
    
    // ========================================================================
    // 2. OFF-SCREEN TEXT
    // ========================================================================
    
    if (config.checkOffscreen && visibilityState === 'visible') {
      const offscreenInfo = isElementOffScreen(element);
      
      if (offscreenInfo.isOffscreen()) {
        let direction = '';
        if (offscreenInfo.completelyAbove) direction = 'above viewport';
        else if (offscreenInfo.completelyBelow) direction = 'below viewport';
        else if (offscreenInfo.completelyLeft) direction = 'left of viewport';
        else if (offscreenInfo.completelyRight) direction = 'right of viewport';
        
        elementIssues.push({
          type: 'offscreen',
          severity: 'warning',
          message: 'Text positioned completely ' + direction,
          direction: direction,
          position: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom)
          }
        });
        
        stats.offscreen++;
      }
    }
    
    // ========================================================================
    // 3. CLIPPED BY PARENT (partially or completely hidden)
    // ========================================================================
    
    if (config.checkClipped && visibilityState === 'visible') {
      const clipInfo = isClippedByParent(element);
      
      if (clipInfo && clipInfo.isClipped) {
        if (clipInfo.completelyClipped) {
          elementIssues.push({
            type: 'completely-clipped',
            severity: 'critical',
            message: 'Text completely clipped by parent overflow:hidden',
            parent: clipInfo.parentSelector,
            clippedAmount: clipInfo.clippedAmount
          });
          
          stats.completelyHidden++;
        } else if (config.checkPartiallyHidden) {
          elementIssues.push({
            type: 'partially-clipped',
            severity: 'warning',
            message: 'Text partially clipped by parent (' + clipInfo.visiblePercentage + '% visible)',
            parent: clipInfo.parentSelector,
            visiblePercentage: clipInfo.visiblePercentage,
            clippedAmount: clipInfo.clippedAmount
          });
          
          stats.partiallyHidden++;
          stats.clipped++;
        }
      }
    }
    
    // ========================================================================
    // 4. CONTENT OVERFLOW (text scrolls beyond visible area)
    // ========================================================================
    
    if (config.checkOverflow && visibilityState === 'visible') {
      const overflowInfo = getOverflowInfo(element);
      
      if (overflowInfo.hasOverflow) {
        const canScrollX = styles.overflowX === 'auto' || styles.overflowX === 'scroll';
        const canScrollY = styles.overflowY === 'auto' || styles.overflowY === 'scroll';
        
        if (overflowInfo.horizontal >= config.minOverflow) {
          elementIssues.push({
            type: 'horizontal-overflow',
            severity: canScrollX ? 'info' : 'warning',
            message: 'Text overflows horizontally (' + overflowInfo.horizontal + 'px, ' + 
                     overflowInfo.horizontalPercent + '% hidden)',
            overflow: overflowInfo.horizontal,
            percentHidden: overflowInfo.horizontalPercent,
            canScroll: canScrollX,
            overflowX: styles.overflowX
          });
          
          stats.overflow++;
        }
        
        if (overflowInfo.vertical >= config.minOverflow) {
          elementIssues.push({
            type: 'vertical-overflow',
            severity: canScrollY ? 'info' : 'warning',
            message: 'Text overflows vertically (' + overflowInfo.vertical + 'px, ' + 
                     overflowInfo.verticalPercent + '% hidden)',
            overflow: overflowInfo.vertical,
            percentHidden: overflowInfo.verticalPercent,
            canScroll: canScrollY,
            overflowY: styles.overflowY
          });
          
          stats.overflow++;
        }
      }
    }
    
    // ========================================================================
    // 5. TEXT-OVERFLOW: ELLIPSIS (truncated text)
    // ========================================================================
    
    if (config.checkPartiallyHidden && styles.textOverflow === 'ellipsis') {
      const overflowInfo = getOverflowInfo(element);
      
      if (overflowInfo.hasOverflow) {
        elementIssues.push({
          type: 'ellipsis-truncated',
          severity: 'info',
          message: 'Text truncated with ellipsis (...)',
          hiddenContent: overflowInfo.horizontal + 'px',
          fullText: text.substring(0, 100)
        });
        
        stats.partiallyHidden++;
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
          scrollHeight: element.scrollHeight,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight
        },
        position: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          bottom: Math.round(rect.bottom),
          right: Math.round(rect.right)
        },
        styles: {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          overflow: styles.overflow,
          overflowX: styles.overflowX,
          overflowY: styles.overflowY,
          position: styles.position,
          textOverflow: styles.textOverflow
        },
        visibilityState: visibilityState,
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
  
  console.log('🔍 Scanning ' + elements.length + ' elements for visibility issues...');
  
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
    let md = '# Text Visibility Issues Report\n\n';
    md += '**Website:** `' + window.location.hostname + '`\n\n';
    
    md += '## Summary\n\n';
    md += '- Total elements scanned: ' + stats.totalElements + '\n';
    md += '- Text elements: ' + stats.textElements + '\n';
    md += '- **Total issues: ' + issues.length + '**\n\n';
    
    md += '### Issue Breakdown\n';
    md += '- 🔴 **Completely hidden:** ' + stats.completelyHidden + '\n';
    md += '  - Display/visibility hidden\n';
    md += '  - Clipped completely by parent\n';
    md += '  - Zero dimensions\n';
    md += '- 🟡 **Partially hidden:** ' + stats.partiallyHidden + '\n';
    md += '  - Clipped by parent overflow\n';
    md += '  - Truncated with ellipsis\n';
    md += '- 🟠 **Overflow (goes outside):** ' + stats.overflow + '\n';
    md += '  - Horizontal overflow\n';
    md += '  - Vertical overflow\n';
    md += '- 🔵 **Off-screen:** ' + stats.offscreen + '\n\n';
    md += '---\n\n';
    
    if (issues.length === 0) {
      md += '## ✅ No Visibility Issues Found!\n\n';
      md += 'All text is properly visible and contained.\n';
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
      
      md += '**Visibility State:** `' + issue.visibilityState + '`\n\n';
      
      md += '| Property | Value |\n';
      md += '|----------|-------|\n';
      md += '| Display | `' + issue.styles.display + '` |\n';
      md += '| Visibility | `' + issue.styles.visibility + '` |\n';
      md += '| Opacity | `' + issue.styles.opacity + '` |\n';
      md += '| Position | `' + issue.styles.position + '` |\n';
      md += '| Width | ' + issue.dimensions.width + 'px |\n';
      md += '| Height | ' + issue.dimensions.height + 'px |\n';
      md += '| Scroll Width | ' + issue.dimensions.scrollWidth + 'px |\n';
      md += '| Scroll Height | ' + issue.dimensions.scrollHeight + 'px |\n\n';
      
      md += '**Problems:**\n';
      issue.issues.forEach(i => {
        const iIcon = severityIcons[i.severity];
        md += '- ' + iIcon + ' **' + i.message + '**\n';
        
        if (i.type === 'completely-clipped' || i.type === 'partially-clipped') {
          md += '  - Parent: `' + i.parent + '`\n';
          if (i.visiblePercentage !== undefined) {
            md += '  - Visible: ' + i.visiblePercentage + '%\n';
          }
          md += '  - Clipped: top=' + i.clippedAmount.top + 'px, right=' + 
                i.clippedAmount.right + 'px, bottom=' + i.clippedAmount.bottom + 
                'px, left=' + i.clippedAmount.left + 'px\n';
        } else if (i.type === 'horizontal-overflow' || i.type === 'vertical-overflow') {
          md += '  - Overflow: ' + i.overflow + 'px (' + i.percentHidden + '% hidden)\n';
          md += '  - Can scroll: ' + (i.canScroll ? 'Yes' : 'No') + '\n';
        } else if (i.type === 'offscreen') {
          md += '  - Direction: ' + i.direction + '\n';
          md += '  - Position: ' + JSON.stringify(i.position) + '\n';
        }
      });
      md += '\n';
      
      md += '**Suggested Fixes:**\n';
      md += '```css\n';
      md += issue.selector + ' {\n';
      
      issue.issues.forEach(i => {
        if (i.type === 'completely-hidden') {
          if (i.method === 'display-none') {
            md += '  display: block; /* or flex, grid, etc */\n';
          } else if (i.method === 'visibility-hidden') {
            md += '  visibility: visible;\n';
          } else if (i.method === 'opacity-zero') {
            md += '  opacity: 1;\n';
          } else if (i.method.includes('zero')) {
            md += '  width: auto; /* or specific value */\n';
            md += '  height: auto; /* or specific value */\n';
          }
        } else if (i.type === 'completely-clipped' || i.type === 'partially-clipped') {
          md += '  /* Fix parent clipping */\n';
          md += '  /* Option 1: Change parent */\n';
          md += '  /* ' + i.parent + ' { overflow: visible; } */\n';
          md += '  /* Option 2: Reposition element */\n';
          md += '  position: relative;\n';
          md += '  z-index: 1;\n';
        } else if (i.type.includes('overflow')) {
          md += '  /* Fix overflow */\n';
          md += '  overflow: auto; /* Allow scrolling */\n';
          md += '  /* OR */\n';
          md += '  white-space: normal; /* Allow wrapping */\n';
          md += '  word-wrap: break-word;\n';
        } else if (i.type === 'offscreen') {
          md += '  /* Fix positioning */\n';
          md += '  position: static; /* or adjust top/left values */\n';
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
          console.log('📋 Visibility report copied to clipboard!');
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
  
  console.group('👁️ Text Visibility Analysis');
  console.log('Elements scanned:', stats.totalElements);
  console.log('Text elements:', stats.textElements);
  console.log('Issues found:', issues.length);
  console.log('');
  console.log('Breakdown:');
  console.log('  🔴 Completely hidden:', stats.completelyHidden);
  console.log('  🟡 Partially hidden:', stats.partiallyHidden);
  console.log('  🟠 Overflow:', stats.overflow);
  console.log('  🔵 Off-screen:', stats.offscreen);
  
  if (issues.length > 0) {
    console.group('📋 Issues');
    issues.forEach((issue, i) => {
      const icons = issue.issues.map(iss => {
        if (iss.type.includes('hidden') || iss.type.includes('clipped')) return '🔴';
        if (iss.type.includes('overflow')) return '🟠';
        if (iss.type.includes('offscreen')) return '🔵';
        return '🟡';
      });
      
      console.group(icons[0] + ' ' + (i + 1) + '. ' + issue.selector);
      console.log('Element:', issue.element);
      console.log('State:', issue.visibilityState);
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
  
  results.highlight = function(filterType) {
    const colorsMap = {
      'completely-hidden': 'darkred',
      'completely-clipped': 'red',
      'partially-clipped': 'orange',
      'horizontal-overflow': 'purple',
      'vertical-overflow': 'blue',
      'offscreen': 'magenta',
      'ellipsis-truncated': 'cyan'
    };
    
    issues.forEach(issue => {
      const issueTypes = issue.issues.map(i => i.type);
      
      // Filter by type if specified
      if (filterType && !issueTypes.includes(filterType)) return;
      
      // Choose color based on most severe issue type
      let color = 'orange';
      for (const type of issueTypes) {
        if (colorsMap[type]) {
          color = colorsMap[type];
          break;
        }
      }
      
      issue.element.style.outline = '3px solid ' + color;
      issue.element.style.outlineOffset = '2px';
      issue.element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      issue.element.title = issue.issues.map(i => i.message).join('; ');
    });
    
    console.log('🎨 Highlighted ' + issues.length + ' elements with visibility issues');
  };
  
  results.removeHighlight = function() {
    issues.forEach(issue => {
      issue.element.style.outline = '';
      issue.element.style.outlineOffset = '';
      issue.element.style.backgroundColor = '';
      issue.element.title = '';
    });
    console.log('✅ Removed highlights');
  };
  
  // Filter methods for specific issue types
  results.getCompletelyHidden = function() {
    return issues.filter(i => i.issues.some(iss => 
      iss.type === 'completely-hidden' || iss.type === 'completely-clipped'
    ));
  };
  
  results.getPartiallyHidden = function() {
    return issues.filter(i => i.issues.some(iss => 
      iss.type === 'partially-clipped' || iss.type === 'ellipsis-truncated'
    ));
  };
  
  results.getOverflow = function() {
    return issues.filter(i => i.issues.some(iss => 
      iss.type.includes('overflow')
    ));
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
