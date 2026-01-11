/**
 * Color Scheme Extractor
 * Analyzes and extracts the main color palette used on a website
 * @param {Object} options - Configuration options
 */
(function extractColorScheme(options) {
  'use strict';
  
  options = options || {};
  
  const config = {
    includeTransparent: false,    // Include transparent/rgba colors
    minOccurrence: 3,              // Minimum times a color must appear
    groupSimilar: true,            // Group similar colors together
    similarityThreshold: 15,       // Color difference threshold (0-255)
    maxColors: 20,                 // Maximum colors to extract
    includeGradients: true,        // Extract gradient colors
    scanDepth: 'full',             // 'viewport' or 'full'
    ...options
  };

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
      a: imageData[3] / 255,
      original: colorStr
    };
  }
  
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  function colorDistance(c1, c2) {
    // Euclidean distance in RGB space
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }
  
  function getLuminance(r, g, b) {
    // Relative luminance (WCAG formula)
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  function getColorName(r, g, b) {
    const luminance = getLuminance(r, g, b);
    
    // Check for grayscale
    if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10) {
      if (luminance > 0.9) return 'White';
      if (luminance < 0.1) return 'Black';
      if (luminance > 0.7) return 'Light Gray';
      if (luminance < 0.3) return 'Dark Gray';
      return 'Gray';
    }
    
    // Dominant channel
    const max = Math.max(r, g, b);
    const saturation = (max - Math.min(r, g, b)) / (max || 1);
    
    if (saturation < 0.2) {
      return luminance > 0.5 ? 'Light Gray' : 'Dark Gray';
    }
    
    if (r === max && g > b) return luminance > 0.5 ? 'Light Orange' : 'Orange';
    if (r === max && b > g) return luminance > 0.5 ? 'Light Pink' : 'Red';
    if (r === max) return luminance > 0.5 ? 'Light Red' : 'Red';
    if (g === max && r > b) return luminance > 0.5 ? 'Light Yellow' : 'Yellow';
    if (g === max) return luminance > 0.5 ? 'Light Green' : 'Green';
    if (b === max && r > g) return luminance > 0.5 ? 'Light Purple' : 'Purple';
    if (b === max) return luminance > 0.5 ? 'Light Blue' : 'Blue';
    
    return 'Unknown';
  }

  // ============================================================================
  // COLOR EXTRACTION
  // ============================================================================
  
  const colorMap = new Map(); // hex -> {count, rgb, sources}
  
  function addColor(colorStr, source) {
    if (!colorStr || colorStr === 'none') return;
    
    try {
      const parsed = parseColor(colorStr);
      
      // Skip transparent if configured
      if (!config.includeTransparent && parsed.a < 0.1) return;
      
      const hex = rgbToHex(parsed.r, parsed.g, parsed.b);
      
      if (!colorMap.has(hex)) {
        colorMap.set(hex, {
          hex: hex,
          rgb: parsed,
          count: 0,
          sources: new Set(),
          luminance: getLuminance(parsed.r, parsed.g, parsed.b),
          name: getColorName(parsed.r, parsed.g, parsed.b)
        });
      }
      
      const entry = colorMap.get(hex);
      entry.count++;
      entry.sources.add(source);
    } catch (e) {
      // Invalid color, skip
    }
  }
  
  function extractGradientColors(gradientStr) {
    // Extract colors from gradient strings
    const colorRegex = /(#[0-9a-f]{3,6}|rgba?\([^)]+\)|hsl\([^)]+\))/gi;
    const matches = gradientStr.match(colorRegex);
    if (matches) {
      matches.forEach(color => addColor(color, 'gradient'));
    }
  }
  
  // Get all elements to scan
  const elements = config.scanDepth === 'viewport'
    ? Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })
    : document.querySelectorAll('*');
  
  console.log('🔍 Scanning ' + elements.length + ' elements...');
  
  // Extract colors from computed styles
  elements.forEach(el => {
    const styles = getComputedStyle(el);
    
    // Text colors
    addColor(styles.color, 'color');
    
    // Background colors
    addColor(styles.backgroundColor, 'background-color');
    
    // Border colors
    addColor(styles.borderTopColor, 'border-color');
    addColor(styles.borderRightColor, 'border-color');
    addColor(styles.borderBottomColor, 'border-color');
    addColor(styles.borderLeftColor, 'border-color');
    
    // Outline
    addColor(styles.outlineColor, 'outline-color');
    
    // Shadows
    if (styles.boxShadow && styles.boxShadow !== 'none') {
      extractGradientColors(styles.boxShadow);
    }
    if (styles.textShadow && styles.textShadow !== 'none') {
      extractGradientColors(styles.textShadow);
    }
    
    // Gradients
    if (config.includeGradients) {
      if (styles.backgroundImage && styles.backgroundImage.includes('gradient')) {
        extractGradientColors(styles.backgroundImage);
      }
    }
  });

  // ============================================================================
  // COLOR GROUPING
  // ============================================================================
  
  let colors = Array.from(colorMap.values())
    .filter(c => c.count >= config.minOccurrence)
    .sort((a, b) => b.count - a.count);
  
  if (config.groupSimilar) {
    const grouped = [];
    const used = new Set();
    
    colors.forEach(color => {
      if (used.has(color.hex)) return;
      
      const group = {
        primary: color,
        variations: [],
        totalCount: color.count
      };
      
      colors.forEach(other => {
        if (color.hex === other.hex || used.has(other.hex)) return;
        
        const distance = colorDistance(color.rgb, other.rgb);
        if (distance <= config.similarityThreshold) {
          group.variations.push(other);
          group.totalCount += other.count;
          used.add(other.hex);
        }
      });
      
      used.add(color.hex);
      grouped.push(group);
    });
    
    colors = grouped
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, config.maxColors)
      .map(g => g.primary);
  } else {
    colors = colors.slice(0, config.maxColors);
  }

  // ============================================================================
  // CATEGORIZE COLORS
  // ============================================================================
  
  const categories = {
    primary: [],
    text: [],
    background: [],
    accent: [],
    neutral: []
  };
  
  colors.forEach(color => {
    const sources = Array.from(color.sources);
    
    // Categorization logic
    if (color.name.includes('Gray') || color.name.includes('White') || color.name.includes('Black')) {
      categories.neutral.push(color);
    } else if (sources.includes('color')) {
      categories.text.push(color);
    } else if (sources.includes('background-color')) {
      categories.background.push(color);
    } else if (color.count > 10) {
      categories.primary.push(color);
    } else {
      categories.accent.push(color);
    }
  });

  // ============================================================================
  // RESULTS
  // ============================================================================
  
  const results = {
    totalColors: colorMap.size,
    uniqueColors: colors.length,
    categories: categories,
    allColors: colors,
    stats: {
      mostUsed: colors[0],
      leastUsed: colors[colors.length - 1],
      totalOccurrences: colors.reduce((sum, c) => sum + c.count, 0)
    }
  };

  // ============================================================================
  // MARKDOWN GENERATION
  // ============================================================================
  
  function generateMarkdown() {
    let md = '# Color Scheme Analysis\n\n';
    md += '**Website:** `' + window.location.hostname + '`\n\n';
    md += '**Stats:**\n';
    md += '- Total unique colors found: ' + results.totalColors + '\n';
    md += '- Colors after filtering: ' + results.uniqueColors + '\n';
    md += '- Total color occurrences: ' + results.stats.totalOccurrences + '\n\n';
    md += '---\n\n';
    
    // Main colors table
    md += '## Main Color Palette\n\n';
    md += '| Preview | Hex | RGB | Name | Usage | Sources |\n';
    md += '|---------|-----|-----|------|-------|----------|\n';
    
    colors.forEach(color => {
      const preview = '![](https://via.placeholder.com/30x30/' + color.hex.slice(1) + '/' + color.hex.slice(1) + '.png)';
      const rgb = 'rgb(' + color.rgb.r + ', ' + color.rgb.g + ', ' + color.rgb.b + ')';
      const sources = Array.from(color.sources).join(', ');
      
      md += '| ' + preview + ' | `' + color.hex + '` | `' + rgb + '` | ' + color.name + ' | ' + color.count + 'x | ' + sources + ' |\n';
    });
    
    md += '\n';
    
    // Categories
    Object.entries(categories).forEach(([category, categoryColors]) => {
      if (categoryColors.length === 0) return;
      
      md += '## ' + category.charAt(0).toUpperCase() + category.slice(1) + ' Colors\n\n';
      
      categoryColors.forEach(color => {
        md += '- **' + color.name + '** `' + color.hex + '` - Used ' + color.count + ' times\n';
      });
      
      md += '\n';
    });
    
    // CSS Variables suggestion
    md += '## CSS Variables Suggestion\n\n';
    md += '```css\n:root {\n';
    colors.slice(0, 10).forEach((color, i) => {
      const varName = '--color-' + (color.name.toLowerCase().replace(/\s+/g, '-'));
      md += '  ' + varName + ': ' + color.hex + ';\n';
    });
    md += '}\n```\n\n';
    
    return md;
  }

  // ============================================================================
  // SMART CLIPBOARD COPY
  // ============================================================================
  
  function smartCopy(text) {
    if (document.hasFocus()) {
      return navigator.clipboard.writeText(text)
        .then(() => {
          console.log('📋 Color scheme markdown copied to clipboard!');
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
  
  console.group('🎨 Color Scheme Analysis');
  console.log('Total colors found:', results.totalColors);
  console.log('Filtered colors:', results.uniqueColors);
  
  console.group('📊 Main Colors');
  colors.forEach(color => {
    console.log(
      '%c     %c ' + color.hex + ' - ' + color.name + ' (' + color.count + 'x)',
      'background:' + color.hex + ';padding:10px;border:1px solid #ccc',
      'color:inherit'
    );
  });
  console.groupEnd();
  
  Object.entries(categories).forEach(([category, categoryColors]) => {
    if (categoryColors.length === 0) return;
    
    console.group('📁 ' + category.charAt(0).toUpperCase() + category.slice(1));
    categoryColors.forEach(color => {
      console.log(
        '%c  %c ' + color.hex + ' (' + color.count + 'x)',
        'background:' + color.hex + ';padding:5px;border:1px solid #ccc',
        'color:inherit'
      );
    });
    console.groupEnd();
  });
  
  console.groupEnd();
  
  // ============================================================================
  // MARKDOWN OUTPUT & COPY
  // ============================================================================
  
  const markdown = generateMarkdown();
  results.markdown = markdown;
  
  results.copy = function() {
    return smartCopy(this.markdown);
  };
  
  smartCopy(markdown);
  
  return results;
})();
