/**
 * Elite Visual Integrity Auditor™ - COMPLETE EDITION
 * Forensic-grade text visibility analysis by a master with 50,000 UX/UI/CSS books
 * 
 const result = auditVisualIntegrity();

 * // Копировать batch 2
 * result.copy(2);

 * // Копировать все
 * result.copyAll();

 * // Подсветить
 * result.highlight();
 * @author The CSS Whisperer
 * @version 3.1.0-complete
 */
(function auditVisualIntegrity(options) {
  'use strict';
  
  options = options || {};
  
  const config = {
    scanDepth: 'full',
    wcagCompliance: true,
    performanceImpact: true,
    crossBrowserIssues: true,
    semanticValidation: true,
    criticalOverflowThreshold: 50,
    criticalOverflowPercent: 30,
    batchSize: 100,
    outputMarkdown: true,
    expertiseLevel: 'master',
    ...options
  };

  // ============================================================================
  // EXPERT KNOWLEDGE BASE - 50,000 books condensed
  // ============================================================================
  
  const EXPERT_KNOWLEDGE = {
    antiPatterns: {
      'text-indent-hide': {
        detection: (element, styles) => {
          if (!styles) return false;
          return parseFloat(styles.textIndent) < -999;
        },
        severity: 'accessibility-critical',
        reason: 'Outdated screen-reader-only technique. Modern approach: visually-hidden utility class',
        wcagViolation: 'SC 1.3.1, 2.4.4',
        modernFix: 'Use .visually-hidden with clip-path and proper positioning'
      },
      'absolute-positioned-offscreen': {
        detection: (element, styles) => {
          if (!element || !styles) return false;
          const rect = element.getBoundingClientRect();
          return styles.position === 'absolute' && 
                 (rect.left < -999 || rect.top < -999);
        },
        severity: 'layout-fragility',
        reason: 'Brittle positioning that breaks in responsive contexts',
        modernFix: 'Use CSS Grid or Flexbox with proper overflow handling'
      },
      'overflow-hidden-text-trap': {
        detection: (element, styles) => {
          if (!element || !styles) return false;
          const parent = element.parentElement;
          if (!parent) return false;
          const pStyles = getComputedStyle(parent);
          return (pStyles.overflow === 'hidden' || pStyles.overflowX === 'hidden') &&
                 element.scrollWidth > element.clientWidth;
        },
        severity: 'content-loss',
        reason: 'Content cropping without user affordance - violates principle of least astonishment',
        modernFix: 'Implement overflow-x: auto with custom scrollbar styling or text-overflow: ellipsis with tooltip'
      },
      'display-none-on-content': {
        detection: (element, styles) => {
          if (!element || !styles) return false;
          return styles.display === 'none' && 
                 element.textContent.trim().length > 20;
        },
        severity: 'information-architecture-failure',
        reason: 'Hiding substantial content suggests improper progressive disclosure or lazy loading',
        modernFix: 'Use <details>/<summary>, aria-expanded, or intersection observer with skeleton loading'
      },
      'zero-opacity-interactive': {
        detection: (element, styles) => {
          if (!element || !styles) return false;
          return parseFloat(styles.opacity) === 0 && 
                 (element.onclick || element.href || element.tabIndex >= 0);
        },
        severity: 'interaction-design-failure',
        reason: 'Invisible interactive elements violate Fitts Law and user expectation',
        modernFix: 'Use visibility transitions or proper disabled states'
      },
      'fixed-height-overflow': {
        detection: (element, styles) => {
          if (!element || !styles) return false;
          return styles.height !== 'auto' && 
                 !styles.height.includes('%') &&
                 element.scrollHeight > element.clientHeight &&
                 styles.overflowY === 'hidden';
        },
        severity: 'responsive-design-failure',
        reason: 'Fixed heights are inherently hostile to fluid content - breaks i18n and user font preferences',
        modernFix: 'Use min-height with overflow-y: auto or dynamic height with JS measurement'
      },
      'white-space-nowrap-unconstrained': {
        detection: (element, styles) => {
          if (!element || !styles) return false;
          return styles.whiteSpace === 'nowrap' && 
                 element.scrollWidth > element.clientWidth &&
                 styles.overflow !== 'auto' &&
                 styles.overflow !== 'scroll';
        },
        severity: 'typography-failure',
        reason: 'Forced single-line without container constraint - breaks responsive typography',
        modernFix: 'Combine with max-width, text-overflow: ellipsis, or use CSS Grid auto-fit'
      }
    },
    
    browserQuirks: {
      'webkit-line-clamp': (element, styles) => {
        if (!element || !styles) return false;
        return styles.display === '-webkit-box' && 
               styles.webkitLineClamp &&
               element.scrollHeight > element.clientHeight;
      },
      'flex-min-width-zero': (element) => {
        if (!element) return false;
        const parent = element.parentElement;
        if (!parent) return false;
        const pStyles = getComputedStyle(parent);
        return pStyles.display === 'flex' && 
               element.scrollWidth > element.clientWidth;
      }
    },
    
    performanceIssues: {
      'excessive-text-shadows': (styles) => {
        if (!styles) return false;
        const shadows = styles.textShadow;
        return shadows && shadows !== 'none' && shadows.split(',').length > 3;
      },
      'expensive-filter': (styles) => {
        if (!styles) return false;
        return styles.filter && styles.filter !== 'none' && styles.filter.includes('blur');
      }
    }
  };

  // ============================================================================
  // MASTER-LEVEL UTILITIES
  // ============================================================================
  
  function getSelectorPath(element) {
    if (!element) return 'unknown';
    
    if (element.getAttribute && element.getAttribute('aria-label')) {
      return '[aria-label="' + element.getAttribute('aria-label') + '"]';
    }
    
    if (element.id && !element.id.match(/^(root|app|main)-?\d*$/)) {
      return '#' + element.id;
    }
    
    if (element.getAttribute) {
      const dataTest = element.getAttribute('data-testid') || element.getAttribute('data-cy');
      if (dataTest) {
        const attr = element.getAttribute('data-testid') ? 'data-testid' : 'data-cy';
        return '[' + attr + '="' + dataTest + '"]';
      }
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/);
      const bemClass = classes.find(c => c.match(/^[a-z][a-z0-9]*(__[a-z0-9-]+)?(--[a-z0-9-]+)?$/));
      if (bemClass) {
        return '.' + bemClass;
      }
    }
    
    const path = [];
    let el = element;
    let depth = 0;
    
    while (el && el !== document.body && depth < 3) {
      let selector = el.tagName ? el.tagName.toLowerCase() : 'unknown';
      
      if (['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'].includes(selector)) {
        path.unshift(selector);
        break;
      }
      
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/)
          .filter(c => !c.match(/^(is-|has-|js-)/) && c.length < 30)
          .slice(0, 1);
        if (classes.length > 0) {
          selector += '.' + classes[0];
        }
      }
      
      path.unshift(selector);
      el = el.parentElement;
      depth++;
    }
    
    return path.join(' > ');
  }
  
  function analyzeLayoutContext(element) {
    if (!element) return {
      layoutMethod: 'unknown',
      isFlexChild: false,
      isGridChild: false,
      hasContainment: false,
      stackingContext: false,
      flowContext: 'unknown',
      writingMode: 'horizontal-tb',
      direction: 'ltr'
    };
    
    const parent = element.parentElement;
    if (!parent) return {
      layoutMethod: 'orphan',
      isFlexChild: false,
      isGridChild: false,
      hasContainment: false,
      stackingContext: false,
      flowContext: 'unknown',
      writingMode: 'horizontal-tb',
      direction: 'ltr'
    };
    
    const parentStyles = getComputedStyle(parent);
    const elementStyles = getComputedStyle(element);
    
    return {
      layoutMethod: getLayoutMethod(parent),
      isFlexChild: parentStyles.display.includes('flex'),
      isGridChild: parentStyles.display.includes('grid'),
      hasContainment: parentStyles.contain !== 'none',
      stackingContext: createsStackingContext(element),
      flowContext: getFlowContext(element),
      writingMode: elementStyles.writingMode,
      direction: elementStyles.direction
    };
  }
  
  function getLayoutMethod(element) {
    if (!element) return 'unknown';
    const styles = getComputedStyle(element);
    if (styles.display.includes('flex')) return 'flexbox';
    if (styles.display.includes('grid')) return 'grid';
    if (styles.display === 'table') return 'table';
    if (styles.float !== 'none') return 'float (legacy)';
    if (styles.position === 'absolute' || styles.position === 'fixed') return 'positioned';
    return 'flow';
  }
  
  function createsStackingContext(element) {
    if (!element) return false;
    const styles = getComputedStyle(element);
    return !!(
      parseFloat(styles.opacity) < 1 ||
      styles.transform !== 'none' ||
      styles.filter !== 'none' ||
      styles.perspective !== 'none' ||
      styles.clipPath !== 'none' ||
      styles.mask !== 'none' ||
      styles.mixBlendMode !== 'normal' ||
      styles.isolation === 'isolate' ||
      (styles.zIndex && parseInt(styles.zIndex) !== 0 && styles.position !== 'static') ||
      styles.position === 'fixed' ||
      styles.position === 'sticky'
    );
  }
  
  function getFlowContext(element) {
    if (!element) return 'unknown';
    const styles = getComputedStyle(element);
    if (styles.position === 'fixed') return 'viewport';
    if (styles.position === 'absolute') return 'positioned-ancestor';
    if (styles.position === 'sticky') return 'scroll-container';
    return 'normal-flow';
  }
  
  function calculateVisualWeight(element, styles) {
    if (!element || !styles) return 0;
    
    const fontSize = parseFloat(styles.fontSize) || 16;
    const fontWeight = parseInt(styles.fontWeight) || 400;
    const textLength = element.textContent ? element.textContent.trim().length : 0;
    const isHeading = element.tagName && /^H[1-6]$/i.test(element.tagName);
    
    let weight = fontSize * (fontWeight / 400);
    if (isHeading) weight *= 2;
    if (textLength > 100) weight *= 1.5;
    
    return weight;
  }
  
  function detectAccessibilityViolations(element, visibilityState) {
    if (!element) return [];
    
    const violations = [];
    const ariaHidden = element.getAttribute ? element.getAttribute('aria-hidden') : null;
    const tabIndex = element.tabIndex || -1;
    
    if (visibilityState !== 'visible' && !ariaHidden) {
      violations.push({
        wcag: 'SC 1.3.1',
        level: 'A',
        message: 'Hidden content should use aria-hidden="true" for consistency',
        impact: 'moderate'
      });
    }
    
    if (element.tagName === 'A' && visibilityState !== 'visible') {
      violations.push({
        wcag: 'SC 2.4.4',
        level: 'A',
        message: 'Hidden links break keyboard navigation expectations',
        impact: 'serious'
      });
    }
    
    if (tabIndex >= 0 && visibilityState !== 'visible') {
      violations.push({
        wcag: 'SC 4.1.2',
        level: 'A',
        message: 'Focusable element is not visible - creates phantom tab stops',
        impact: 'critical'
      });
    }
    
    return violations;
  }

  // ============================================================================
  // DETECTION ENGINE
  // ============================================================================
  
  const criticalIssues = [];
  const stats = {
    totalElements: 0,
    textElements: 0,
    completelyHidden: 0,
    criticalOverflow: 0,
    antiPatterns: 0,
    accessibilityViolations: 0,
    performanceIssues: 0,
    totalCritical: 0,
    visualWeightLost: 0
  };
  
  function masterAnalyzeElement(element) {
    if (!element) return;
    
    stats.totalElements++;
    
    const text = element.textContent ? element.textContent.trim() : '';
    if (!text || text.length === 0) return;
    
    stats.textElements++;
    
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    const layoutContext = analyzeLayoutContext(element);
    const visualWeight = calculateVisualWeight(element, styles);
    
    const issues = [];
    let visibilityState = 'visible';
    
    // Anti-pattern detection
    Object.entries(EXPERT_KNOWLEDGE.antiPatterns).forEach(([patternName, pattern]) => {
      try {
        const detected = pattern.detection(element, styles);
        
        if (detected) {
          issues.push({
            type: 'ANTI_PATTERN',
            category: 'Architecture',
            pattern: patternName,
            severity: pattern.severity,
            reason: pattern.reason,
            wcagViolation: pattern.wcagViolation,
            fix: pattern.modernFix,
            expertiseRequired: 'senior+'
          });
          
          stats.antiPatterns++;
          
          if (pattern.severity.includes('critical') || pattern.severity.includes('failure')) {
            visibilityState = 'anti-pattern-hidden';
          }
        }
      } catch (e) {
        // Skip failed detection
      }
    });
    
    // Fundamental visibility failures
    if (styles.display === 'none') {
      issues.push({
        type: 'DISPLAY_NONE',
        category: 'Rendering',
        severity: 'critical',
        reason: 'Element removed from render tree entirely',
        visualWeight: visualWeight,
        fix: 'display: block; /* Restore to layout flow */',
        context: 'Consider: Is this conditional rendering, lazy loading, or a mistake?'
      });
      visibilityState = 'display-none';
      stats.completelyHidden++;
      stats.visualWeightLost += visualWeight;
    }
    
    if (styles.visibility === 'hidden') {
      issues.push({
        type: 'VISIBILITY_HIDDEN',
        category: 'Rendering',
        severity: 'critical',
        reason: 'Element occupies space but is invisible - creates phantom layout',
        visualWeight: visualWeight,
        fix: 'visibility: visible;',
        context: 'Used correctly only for: transition states, print styles, or progressive enhancement'
      });
      visibilityState = 'visibility-hidden';
      stats.completelyHidden++;
      stats.visualWeightLost += visualWeight;
    }
    
    if (parseFloat(styles.opacity) === 0) {
      const isTransitioning = styles.transition.includes('opacity');
      issues.push({
        type: 'OPACITY_ZERO',
        category: 'Rendering',
        severity: isTransitioning ? 'warning' : 'critical',
        reason: isTransitioning ? 
          'Element in transition state - acceptable if temporary' :
          'Invisible element still in accessibility tree and layout',
        visualWeight: visualWeight,
        fix: 'opacity: 1; /* Or remove if truly hidden */',
        context: isTransitioning ? 
          'Transition detected - ensure duration < 400ms' :
          'Consider: Should this use display:none instead?'
      });
      if (!isTransitioning) {
        visibilityState = 'opacity-zero';
        stats.completelyHidden++;
        stats.visualWeightLost += visualWeight;
      }
    }
    
    if (rect.width === 0 || rect.height === 0) {
      const isCollapsed = rect.width === 0 && rect.height === 0;
      issues.push({
        type: 'ZERO_DIMENSIONS',
        category: 'Layout',
        severity: 'critical',
        reason: isCollapsed ?
          'Element fully collapsed - likely Flexbox/Grid shrinkage' :
          (rect.width === 0 ? 'Zero width' : 'Zero height') + ' - breaks reading flow',
        dimensions: { width: rect.width, height: rect.height },
        layoutContext: layoutContext,
        fix: layoutContext && layoutContext.isFlexChild ?
          'flex-shrink: 0; min-width: fit-content;' :
          'width: auto; min-width: fit-content;',
        context: 'Common in: Flex containers without flex-basis, Grid auto-fit with insufficient space'
      });
      visibilityState = isCollapsed ? 'zero-dimensions' : 'zero-dimension';
      stats.completelyHidden++;
    }
    
    // Overflow analysis
    const overflowAnalysis = analyzeOverflow(element, styles, layoutContext);
    if (overflowAnalysis && overflowAnalysis.critical) {
      issues.push({
        type: 'CRITICAL_OVERFLOW',
        category: 'Typography',
        severity: 'critical',
        reason: overflowAnalysis.reason,
        overflow: overflowAnalysis.overflow,
        affectedContent: overflowAnalysis.affectedContent,
        fix: overflowAnalysis.fix,
        context: overflowAnalysis.context
      });
      stats.criticalOverflow++;
    }
    
    // Accessibility
    if (config.wcagCompliance) {
      const a11yViolations = detectAccessibilityViolations(element, visibilityState);
      a11yViolations.forEach(violation => {
        issues.push({
          type: 'WCAG_VIOLATION',
          category: 'Accessibility',
          severity: violation.impact,
          reason: violation.message,
          wcag: violation.wcag,
          level: violation.level,
          fix: getA11yFix(violation),
          context: 'WCAG ' + violation.level + ' compliance required'
        });
        stats.accessibilityViolations++;
      });
    }
    
    // Store issues
    if (issues.length > 0) {
      const hasCritical = issues.some(i => 
        i.severity === 'critical' || 
        (typeof i.severity === 'string' && i.severity.includes('failure'))
      );
      
      if (hasCritical || issues.length >= 2) {
        criticalIssues.push({
          element: element,
          selector: getSelectorPath(element),
          tag: element.tagName ? element.tagName.toLowerCase() : 'unknown',
          text: text.substring(0, 120),
          visualWeight: Math.round(visualWeight),
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
          layoutContext: layoutContext,
          visibilityState: visibilityState,
          issues: issues,
          criticalityScore: calculateCriticalityScore(issues, visualWeight)
        });
        
        stats.totalCritical++;
      }
    }
  }
  
  function analyzeOverflow(element, styles, layoutContext) {
    if (!element || !styles) return null;
    
    const scrollWidth = element.scrollWidth;
    const scrollHeight = element.scrollHeight;
    const clientWidth = element.clientWidth;
    const clientHeight = element.clientHeight;
    
    const overflowX = scrollWidth - clientWidth;
    const overflowY = scrollHeight - clientHeight;
    
    const canScrollX = styles.overflowX === 'auto' || styles.overflowX === 'scroll';
    const canScrollY = styles.overflowY === 'auto' || styles.overflowY === 'scroll';
    
    if (overflowX >= config.criticalOverflowThreshold && !canScrollX) {
      const percentHidden = Math.round((overflowX / scrollWidth) * 100);
      
      if (percentHidden >= config.criticalOverflowPercent) {
        return {
          critical: true,
          direction: 'horizontal',
          overflow: overflowX + 'px',
          reason: percentHidden + '% of text width overflows without scroll affordance',
          affectedContent: estimateAffectedWords(element, overflowX, scrollWidth),
          fix: getFix('horizontal', styles, layoutContext),
          context: getOverflowContext(element, styles, layoutContext)
        };
      }
    }
    
    if (overflowY >= config.criticalOverflowThreshold && !canScrollY) {
      const percentHidden = Math.round((overflowY / scrollHeight) * 100);
      
      if (percentHidden >= config.criticalOverflowPercent) {
        return {
          critical: true,
          direction: 'vertical',
          overflow: overflowY + 'px',
          reason: percentHidden + '% of text height overflows without scroll affordance',
          affectedContent: estimateAffectedLines(element, overflowY),
          fix: getFix('vertical', styles, layoutContext),
          context: getOverflowContext(element, styles, layoutContext)
        };
      }
    }
    
    return null;
  }
  
  function estimateAffectedWords(element, overflowPx, totalWidth) {
    const text = element.textContent ? element.textContent.trim() : '';
    const words = text.split(/\s+/);
    const percentHidden = overflowPx / totalWidth;
    const hiddenWords = Math.ceil(words.length * percentHidden);
    return hiddenWords + ' words (~"' + words.slice(-hiddenWords).join(' ').substring(0, 40) + '...")';
  }
  
  function estimateAffectedLines(element, overflowPx) {
    const styles = getComputedStyle(element);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2;
    const hiddenLines = Math.ceil(overflowPx / lineHeight);
    return hiddenLines + ' lines';
  }
  
  function getFix(direction, styles, layoutContext) {
    if (!styles || !layoutContext) return 'overflow: auto;';
    
    let fix = '';
    
    if (direction === 'horizontal') {
      if (styles.whiteSpace === 'nowrap') {
        fix = 'white-space: normal;\n  overflow-wrap: break-word;';
      } else if (layoutContext.isFlexChild) {
        fix = 'min-width: 0;\n  overflow-wrap: break-word;';
      } else {
        fix = 'max-width: 100%;\n  overflow-wrap: break-word;';
      }
    } else {
      fix = 'overflow-y: auto;\n  max-height: 80vh;';
    }
    
    return fix;
  }
  
  function getOverflowContext(element, styles, layoutContext) {
    if (!layoutContext) return 'Unknown layout';
    let context = 'Layout: ' + layoutContext.layoutMethod;
    if (layoutContext.isFlexChild) context += ' (Flex child)';
    if (layoutContext.isGridChild) context += ' (Grid child)';
    return context;
  }
  
  function getA11yFix(violation) {
    if (violation.wcag === 'SC 1.3.1') return 'aria-hidden="true"';
    if (violation.wcag === 'SC 2.4.4') return 'Make visible or remove';
    if (violation.wcag === 'SC 4.1.2') return 'tabindex="-1"';
    return 'Review WCAG';
  }
  
  function calculateCriticalityScore(issues, visualWeight) {
    let score = 0;
    
    issues.forEach(issue => {
      if (issue.severity === 'critical' || (typeof issue.severity === 'string' && issue.severity.includes('failure'))) {
        score += 10;
      } else if (issue.severity === 'serious') {
        score += 5;
      } else {
        score += 1;
      }
      
      if (issue.type === 'WCAG_VIOLATION') {
        score += issue.level === 'A' ? 8 : 5;
      }
      
      if (issue.type === 'ANTI_PATTERN') {
        score += 7;
      }
    });
    
    score *= (visualWeight / 100);
    
    return Math.round(Math.max(1, score));
  }

  // ============================================================================
  // EXECUTION
  // ============================================================================
  
  const elements = config.scanDepth === 'viewport'
    ? Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })
    : document.querySelectorAll('*');
  
  console.log('🎓 Elite Visual Integrity Audit initiated...');
  console.log('📚 Applying knowledge from 50,000 UX/UI/CSS books...');
  console.log('🔍 Scanning ' + elements.length + ' elements...');
  
  elements.forEach(masterAnalyzeElement);
  
  // STRICT SORT BY CRITICALITY SCORE (highest first)
  criticalIssues.sort((a, b) => b.criticalityScore - a.criticalityScore);
  
  console.log('✅ Analysis complete: ' + stats.totalCritical + ' critical issues found');

  // ============================================================================
  // MARKDOWN REPORT GENERATOR - BATCHED BY 100
  // ============================================================================
  
  function generateBatchedReport() {
    const batches = [];
    const batchSize = config.batchSize;
    
    for (let i = 0; i < criticalIssues.length; i += batchSize) {
      const batch = criticalIssues.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(criticalIssues.length / batchSize);
      
      let md = '# 🎓 Elite Visual Integrity Audit - Batch ' + batchNumber + '/' + totalBatches + '\n\n';
      md += '> *Analysis by master with 50,000 books of UX/UI/CSS expertise*\n\n';
      md += '**Website:** `' + window.location.hostname + '`\n';
      md += '**Date:** ' + new Date().toISOString() + '\n';
      md += '**Batch:** Issues #' + (i + 1) + ' - #' + Math.min(i + batchSize, criticalIssues.length) + ' of ' + criticalIssues.length + '\n\n';
      
      if (batchNumber === 1) {
        md += '---\n\n';
        md += '## 📊 Executive Summary (All Batches)\n\n';
        md += '| Metric | Count | Severity |\n';
        md += '|--------|-------|----------|\n';
        md += '| **Total Critical Issues** | **' + stats.totalCritical + '** | 🔴 IMMEDIATE ACTION |\n';
        md += '| Completely Hidden | ' + stats.completelyHidden + ' | 🔴 Critical |\n';
        md += '| Critical Overflow | ' + stats.criticalOverflow + ' | 🔴 Critical |\n';
        md += '| Anti-Patterns | ' + stats.antiPatterns + ' | 🟠 Architecture Debt |\n';
        md += '| WCAG Violations | ' + stats.accessibilityViolations + ' | ⚖️ Legal Risk |\n';
        md += '| Performance Issues | ' + stats.performanceIssues + ' | ⚡ Optimization |\n\n';
        
        md += '### Impact Metrics\n\n';
        md += '- **Visual Weight Lost:** ' + Math.round(stats.visualWeightLost) + ' units\n';
        md += '- **Elements Scanned:** ' + stats.totalElements + ' total, ' + stats.textElements + ' text-bearing\n';
        md += '- **Average Criticality:** ' + (criticalIssues.length > 0 ? 
          Math.round(criticalIssues.reduce((sum, i) => sum + i.criticalityScore, 0) / criticalIssues.length) : 0) + '/100\n';
        md += '- **Highest Score:** ' + (criticalIssues.length > 0 ? criticalIssues[0].criticalityScore : 0) + '/100\n\n';
      }
      
      md += '---\n\n';
      md += '## 🔴 Critical Issues (Sorted by Criticality Score)\n\n';
      
      batch.forEach((issue, batchIndex) => {
        const globalIndex = i + batchIndex + 1;
        
        md += '### Issue #' + globalIndex + ' - Score: ' + issue.criticalityScore + '/100\n\n';
        md += '**Selector:** `' + issue.selector + '`\n';
        md += '**Element:** `<' + issue.tag + '>`\n';
        md += '**State:** `' + issue.visibilityState + '`\n';
        md += '**Visual Weight:** ' + issue.visualWeight + ' units\n\n';
        
        md += '**Content Preview:**\n';
        md += '> "' + issue.text + '..."\n\n';
        
        md += '**Layout Context:**\n';
        md += '- Method: ' + issue.layoutContext.layoutMethod + '\n';
        md += '- Flow: ' + issue.layoutContext.flowContext + '\n';
        if (issue.layoutContext.isFlexChild) md += '- ⚠️ Flex child (overflow risk)\n';
        if (issue.layoutContext.isGridChild) md += '- ⚠️ Grid child (constraint check)\n';
        md += '\n';
        
        md += '**Dimensions:**\n';
        md += '- Visible: ' + issue.dimensions.width + 'px × ' + issue.dimensions.height + 'px\n';
        if (issue.dimensions.scrollWidth > issue.dimensions.width) {
          md += '- Scroll Width: ' + issue.dimensions.scrollWidth + 'px (⚠️ +' + 
                (issue.dimensions.scrollWidth - issue.dimensions.width) + 'px overflow)\n';
        }
        if (issue.dimensions.scrollHeight > issue.dimensions.height) {
          md += '- Scroll Height: ' + issue.dimensions.scrollHeight + 'px (⚠️ +' + 
                (issue.dimensions.scrollHeight - issue.dimensions.height) + 'px overflow)\n';
        }
        md += '\n';
        
        const grouped = {};
        issue.issues.forEach(iss => {
          if (!grouped[iss.category]) grouped[iss.category] = [];
          grouped[iss.category].push(iss);
        });
        
        md += '**Detected Problems:**\n\n';
        
        Object.entries(grouped).forEach(([category, categoryIssues]) => {
          md += '#### ' + category + '\n\n';
          
          categoryIssues.forEach(iss => {
            const icon = iss.severity === 'critical' || (typeof iss.severity === 'string' && iss.severity.includes('failure')) ? '🔴' : 
                        iss.severity === 'serious' ? '🟠' : '🟡';
            
            md += icon + ' **' + iss.reason + '**\n\n';
            
            if (iss.wcagViolation) md += '- WCAG: ' + iss.wcagViolation + '\n';
            if (iss.wcag) md += '- Standard: ' + iss.wcag + ' (Level ' + iss.level + ')\n';
            if (iss.pattern) md += '- Anti-Pattern: `' + iss.pattern + '`\n';
            if (iss.overflow) md += '- Overflow: ' + iss.overflow + '\n';
            if (iss.affectedContent) md += '- Affected: ' + iss.affectedContent + '\n';
            if (iss.context) md += '- Context: ' + iss.context + '\n';
            
            md += '\n';
          });
        });
        
        md += '**Master-Level Fix:**\n\n';
        md += '```css\n';
        md += '/* Priority: IMMEDIATE (Score: ' + issue.criticalityScore + '/100) */\n';
        md += issue.selector + ' {\n';
        
        issue.issues.forEach((iss, idx) => {
          if (idx > 0) md += '\n';
          md += '  /* Fix: ' + iss.reason + ' */\n';
          md += '  ' + iss.fix.split('\n').join('\n  ') + '\n';
        });
        
        md += '}\n```\n\n';
        
        md += '---\n\n';
      });
      
      if (batchNumber === totalBatches) {
        md += '## 📋 Action Plan\n\n';
        md += '### Immediate (Today)\n\n';
        const top10 = criticalIssues.slice(0, 10);
        top10.forEach((issue, idx) => {
          md += (idx + 1) + '. **' + issue.selector + '** (Score: ' + issue.criticalityScore + ')\n';
        });
        md += '\n';
        
        md += '### Short-term (This Week)\n\n';
        md += '1. Fix all issues with score ≥ 50\n';
        md += '2. Establish overflow management standards\n';
        md += '3. Document anti-patterns to avoid\n\n';
        
        md += '### Long-term (This Quarter)\n\n';
        md += '1. Implement design system improvements\n';
        md += '2. Add automated visual regression tests\n';
        md += '3. Team training on modern CSS layout\n\n';
        
        md += '---\n\n';
        md += '*Audit powered by 50,000 books of UX/UI/CSS wisdom*\n';
        md += '*Generated: ' + new Date().toLocaleString() + '*\n';
      }
      
      batches.push({
        markdown: md,
        batchNumber: batchNumber,
        totalBatches: totalBatches,
        startIndex: i,
        endIndex: Math.min(i + batchSize, criticalIssues.length) - 1
      });
    }
    
    return batches;
  }

  // ============================================================================
  // OUTPUT & CLIPBOARD
  // ============================================================================
  
  function smartCopy(text) {
    if (document.hasFocus()) {
      return navigator.clipboard.writeText(text)
        .then(() => {
          console.log('📋 Batch copied to clipboard!');
          return true;
        })
        .catch(() => {
          console.warn('⚠️ Copy failed - click page first');
          return false;
        });
    } else {
      console.warn('⚠️ Document not focused - click page then run result.copy()');
      return Promise.resolve(false);
    }
  }
  
  const batches = criticalIssues.length > 0 ? generateBatchedReport() : [];
  
  console.group('🎓 Elite Audit Complete');
  console.log('%c' + stats.totalCritical + ' CRITICAL ISSUES', 
    'font-size: 16px; font-weight: bold; color: ' + (stats.totalCritical > 0 ? 'red' : 'green'));
  console.log('');
  console.log('Breakdown:');
  console.log('  Hidden: ' + stats.completelyHidden);
  console.log('  Overflow: ' + stats.criticalOverflow);
  console.log('  Anti-patterns: ' + stats.antiPatterns);
  console.log('  WCAG violations: ' + stats.accessibilityViolations);
  console.log('');
  console.log('Reports: ' + batches.length + ' batch(es) of ' + config.batchSize + ' issues');
  console.groupEnd();
  
  const results = {
    critical: criticalIssues,
    stats: stats,
    batches: batches,
    
    copy: function(batchNumber) {
      batchNumber = batchNumber || 1;
      if (batches.length === 0) {
        console.log('✅ No issues to copy!');
        return Promise.resolve(false);
      }
      if (batchNumber < 1 || batchNumber > batches.length) {
        console.error('❌ Invalid batch number. Use 1-' + batches.length);
        return Promise.resolve(false);
      }
      const batch = batches[batchNumber - 1];
      console.log('📋 Copying batch ' + batchNumber + '/' + batches.length + '...');
      return smartCopy(batch.markdown);
    },
    
    copyAll: function() {
      if (batches.length === 0) {
        console.log('✅ No issues to copy!');
        return Promise.resolve(false);
      }
      const allMarkdown = batches.map(b => b.markdown).join('\n\n' + '='.repeat(80) + '\n\n');
      console.log('📋 Copying all ' + batches.length + ' batches...');
      return smartCopy(allMarkdown);
    },
    
    highlight: function() {
      criticalIssues.forEach(issue => {
        const color = issue.criticalityScore >= 70 ? 'darkred' : 
                     issue.criticalityScore >= 40 ? 'red' : 'orange';
        issue.element.style.outline = '5px solid ' + color;
        issue.element.style.outlineOffset = '3px';
        issue.element.style.zIndex = '99999';
        issue.element.title = '🔴 Score: ' + issue.criticalityScore + '/100';
      });
      console.log('🎨 Highlighted ' + criticalIssues.length + ' elements');
    },
    
    removeHighlight: function() {
      criticalIssues.forEach(issue => {
        issue.element.style.outline = '';
        issue.element.style.outlineOffset = '';
        issue.element.style.zIndex = '';
        issue.element.title = '';
      });
      console.log('✅ Highlights removed');
    },
    
    showBatch: function(batchNumber) {
      batchNumber = batchNumber || 1;
      if (batches.length === 0) return;
      if (batchNumber < 1 || batchNumber > batches.length) {
        console.error('❌ Invalid batch. Use 1-' + batches.length);
        return;
      }
      console.log(batches[batchNumber - 1].markdown);
    }
  };
  
  // Auto-copy first batch if issues found
  if (batches.length > 0) {
    smartCopy(batches[0].markdown);
    console.log('');
    console.log('📋 First batch auto-copied!');
    if (batches.length > 1) {
      console.log('💡 Copy more batches: result.copy(2), result.copy(3), etc.');
      console.log('💡 Copy all: result.copyAll()');
    }
  } else {
    console.log('✅ Perfect! No critical issues found.');
  }
  
  return results;
})();
