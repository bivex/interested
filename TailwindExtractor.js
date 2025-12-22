/**
 * Copyright (c) 2025 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2025-12-22T05:35:22
 * Last Updated: 2025-12-22T05:44:35
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

/**
 * Tailwind CSS Configuration Extractor
 * Drop this script into Chrome DevTools console to extract Tailwind settings from any website
 *
 * Usage: Copy and paste the entire script into the console and press Enter
 */

(function() {
    console.log('🔍 Tailwind CSS Configuration Extractor');
    console.log('=====================================');

    // Check if Tailwind CSS is loaded with high precision
    function isTailwindLoaded() {
        let confidenceScore = 0;
        const detectionResults = {};

        // 1. Check for Tailwind CSS links (High confidence: +3)
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const tailwindLinks = links.filter(link =>
            link.href && (
                link.href.includes('tailwindcss.com') ||
                link.href.includes('unpkg.com/tailwindcss') ||
                link.href.includes('jsdelivr.net') && link.href.includes('tailwindcss')
            )
        );
        detectionResults.tailwindLinks = tailwindLinks.length > 0;
        if (detectionResults.tailwindLinks) confidenceScore += 3;

        // 2. Check for Tailwind in style tags (High confidence: +3)
        const styleTags = Array.from(document.querySelectorAll('style'));
        const tailwindStyles = styleTags.filter(style => {
            try {
                const content = style.textContent || '';
                return content.includes('@tailwind') ||
                       content.includes('--tw-') ||
                       content.includes('tailwindcss');
            } catch (e) {
                return false;
            }
        });
        detectionResults.tailwindStyles = tailwindStyles.length > 0;
        if (detectionResults.tailwindStyles) confidenceScore += 3;

        // 3. Check for Tailwind CDN scripts (High confidence: +3)
        const scripts = Array.from(document.querySelectorAll('script'));
        const tailwindScripts = scripts.filter(script =>
            script.src && (
                script.src.includes('cdn.tailwindcss.com') ||
                script.src.includes('tailwindcss.com') ||
                script.src.includes('unpkg.com/tailwindcss')
            )
        );
        detectionResults.tailwindScripts = tailwindScripts.length > 0;
        if (detectionResults.tailwindScripts) confidenceScore += 3;

        // 4. Check for specific Tailwind CSS variables (Very High confidence: +4)
        const root = document.documentElement;
        const computedStyles = getComputedStyle(root);
        const cssProps = Array.from(computedStyles);
        const tailwindVars = cssProps.filter(prop =>
            prop.startsWith('--tw-') &&
            (prop.includes('ring') || prop.includes('border') || prop.includes('bg') ||
             prop.includes('text') || prop.includes('space') || prop.includes('shadow'))
        );
        detectionResults.tailwindVars = tailwindVars.length > 5; // Need multiple vars
        if (detectionResults.tailwindVars) confidenceScore += 4;

        // 5. Check for Tailwind-specific class patterns (Medium confidence: +2 each)
        function detectTailwindClasses(element) {
            if (!element || !element.className) return false;

            const classes = element.className.split(/\s+/);
            const tailwindClassPatterns = [
                // Layout & positioning
                /^container$/,
                /^flex$/,
                /^grid$/,
                /^hidden$/,
                /^block$/,
                /^inline$/,
                /^inline-block$/,
                /^absolute$/,
                /^relative$/,
                /^fixed$/,
                /^sticky$/,
                // Spacing
                /^p-\d+$/,
                /^m-\d+$/,
                /^px-\d+$/,
                /^py-\d+$/,
                /^mx-\d+$/,
                /^my-\d+$/,
                // Width/Height
                /^w-\d+$/,
                /^h-\d+$/,
                /^w-full$/,
                /^h-full$/,
                // Colors (Tailwind specific shades)
                /^bg-(red|blue|green|yellow|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900|950)$/,
                /^text-(red|blue|green|yellow|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900|950)$/,
                /^border-(red|blue|green|yellow|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900|950)$/,
                // Typography
                /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
                /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
                /^leading-(3|4|5|6|7|8|9|10|none|tight|snug|normal|relaxed|loose)$/,
                // Borders
                /^rounded$/,
                /^rounded-(sm|md|lg|xl|2xl|3xl|full)$/,
                /^border$/,
                /^border-(t|r|b|l)$/,
                /^border-\d+$/,
                // Shadows (Tailwind specific)
                /^shadow$/,
                /^shadow-(sm|md|lg|xl|2xl|inner)$/,
                // Responsive prefixes
                /^(sm|md|lg|xl|2xl):/,
                // Dark mode
                /^dark:/,
                // Hover states
                /^hover:/,
                /^focus:/,
                /^active:/
            ];

            return classes.some(cls =>
                cls && tailwindClassPatterns.some(pattern => pattern.test(cls))
            );
        }

        // Check multiple elements for better accuracy
        const elementsToCheck = [
            document.body,
            document.documentElement,
            ...Array.from(document.querySelectorAll('*')).slice(0, 20), // First 20 elements
            ...Array.from(document.querySelectorAll('[class]')).slice(0, 10) // First 10 with classes
        ];

        const elementsWithTailwindClasses = elementsToCheck.filter(detectTailwindClasses);
        detectionResults.tailwindClasses = elementsWithTailwindClasses.length >= 2; // Need at least 2 elements
        if (detectionResults.tailwindClasses) confidenceScore += 2;

        // 6. Check for Tailwind config or build artifacts (Low confidence: +1)
        const hasTailwindConfig = Array.from(document.querySelectorAll('script')).some(script => {
            try {
                return script.textContent && (
                    script.textContent.includes('tailwind.config') ||
                    script.textContent.includes('module.exports')
                );
            } catch (e) {
                return false;
            }
        });
        detectionResults.tailwindConfig = hasTailwindConfig;
        if (detectionResults.tailwindConfig) confidenceScore += 1;

        // 7. Check for common Tailwind utility combinations (Medium confidence: +2)
        const commonTailwindCombos = [
            ['flex', 'items-center', 'justify-center'],
            ['w-full', 'h-full'],
            ['text-center', 'mx-auto'],
            ['bg-white', 'dark:bg-gray-900'],
            ['p-4', 'rounded-lg', 'shadow-md']
        ];

        const hasCombos = elementsToCheck.some(element => {
            if (!element || !element.className) return false;
            const classes = new Set(element.className.split(/\s+/));
            return commonTailwindCombos.some(combo =>
                combo.every(cls => classes.has(cls))
            );
        });
        detectionResults.utilityCombos = hasCombos;
        if (detectionResults.utilityCombos) confidenceScore += 2;

        // Calculate confidence level
        let confidenceLevel = 'Low';
        if (confidenceScore >= 7) confidenceLevel = 'Very High';
        else if (confidenceScore >= 5) confidenceLevel = 'High';
        else if (confidenceScore >= 3) confidenceLevel = 'Medium';

        console.log('🔍 Tailwind Detection Results (Enhanced Precision):');
        console.log('   CSS Links:', detectionResults.tailwindLinks, tailwindLinks.length > 0 ? `(${tailwindLinks.length} found)` : '');
        console.log('   Style Tags:', detectionResults.tailwindStyles, tailwindStyles.length > 0 ? `(${tailwindStyles.length} found)` : '');
        console.log('   Script Tags:', detectionResults.tailwindScripts, tailwindScripts.length > 0 ? `(${tailwindScripts.length} found)` : '');
        console.log('   CSS Variables:', detectionResults.tailwindVars, tailwindVars.length > 0 ? `(${tailwindVars.length} vars)` : '');
        console.log('   Utility Classes:', detectionResults.tailwindClasses, elementsWithTailwindClasses.length > 0 ? `(${elementsWithTailwindClasses.length} elements)` : '');
        console.log('   Config Scripts:', detectionResults.tailwindConfig);
        console.log('   Utility Combos:', detectionResults.utilityCombos);
        console.log('   Confidence Score:', confidenceScore, `/ 10 (${confidenceLevel})`);

        // Require minimum confidence for positive detection
        const isDetected = confidenceScore >= 3; // Minimum threshold

        console.log('   Final Result:', isDetected ? '✅ Tailwind Detected' : '❌ Tailwind Not Detected');

        return isDetected;
    }

    // Extract CSS custom properties
    function extractCSSVariables() {
        const root = document.documentElement;
        const computedStyles = getComputedStyle(root);

        const variables = {};
        const cssProps = [];

        // Get all CSS properties that are custom properties
        for (let i = 0; i < computedStyles.length; i++) {
            const prop = computedStyles[i];
            if (prop.startsWith('--')) {
                const value = computedStyles.getPropertyValue(prop).trim();
                if (value) { // Only include properties with values
                    cssProps.push({ property: prop, value: value });
                }
            }
        }

        // Group variables by category (more comprehensive)
        const grouped = {
            colors: cssProps.filter(p =>
                p.property.includes('color') ||
                p.property.includes('bg') ||
                p.property.includes('text') ||
                p.property.includes('border') ||
                p.property.includes('ring') ||
                p.property.includes('shadow') && p.property.includes('color')
            ),
            spacing: cssProps.filter(p =>
                p.property.includes('spacing') ||
                p.property.includes('padding') ||
                p.property.includes('margin') ||
                p.property.includes('gap') ||
                /^--tw-space-/.test(p.property)
            ),
            typography: cssProps.filter(p =>
                p.property.includes('font') ||
                p.property.includes('text') ||
                p.property.includes('leading') ||
                p.property.includes('tracking')
            ),
            borders: cssProps.filter(p =>
                p.property.includes('border') ||
                p.property.includes('radius') ||
                p.property.includes('outline')
            ),
            shadows: cssProps.filter(p =>
                p.property.includes('shadow') &&
                !p.property.includes('color')
            ),
            animations: cssProps.filter(p =>
                p.property.includes('animation') ||
                p.property.includes('transition') ||
                p.property.includes('transform')
            ),
            other: cssProps.filter(p =>
                !p.property.includes('color') && !p.property.includes('bg') && !p.property.includes('text') &&
                !p.property.includes('spacing') && !p.property.includes('padding') && !p.property.includes('margin') &&
                !p.property.includes('gap') && !/^--tw-space-/.test(p.property) &&
                !p.property.includes('font') && !p.property.includes('leading') && !p.property.includes('tracking') &&
                !p.property.includes('border') && !p.property.includes('radius') && !p.property.includes('outline') &&
                !p.property.includes('shadow') &&
                !p.property.includes('animation') && !p.property.includes('transition') && !p.property.includes('transform')
            )
        };

        return grouped;
    }

    // Extract Tailwind theme colors from CSS variables
    function extractTailwindColors(cssVars) {
        const colors = {};

        // Common Tailwind color patterns
        const colorPatterns = [
            /^--(tw-)?ring$/,
            /^--(tw-)?ring-offset$/,
            /^--(color|tw-color)-([a-z]+)(?:-(\d+))?$/,
            /^--(background|foreground)$/,
            /^--(primary|secondary|accent|muted|destructive|card|popover|border|input)$/,
            /^--(primary|secondary|accent|muted|destructive|card|popover|border|input)-(foreground|DEFAULT)?$/
        ];

        cssVars.colors.forEach(({ property, value }) => {
            const cleanProp = property.replace(/^--(?:tw-)?/, '');
            colors[cleanProp] = value;
        });

        return colors;
    }

    // Extract spacing values
    function extractSpacing(cssVars) {
        const spacing = {};

        cssVars.spacing.forEach(({ property, value }) => {
            const cleanProp = property.replace(/^--(?:tw-)?/, '');
            spacing[cleanProp] = value;
        });

        return spacing;
    }

    // Extract typography settings
    function extractTypography(cssVars) {
        const typography = {
            fonts: {},
            sizes: {}
        };

        cssVars.typography.forEach(({ property, value }) => {
            const cleanProp = property.replace(/^--(?:tw-)?/, '');

            if (cleanProp.includes('font') && cleanProp.includes('family')) {
                const fontName = cleanProp.replace('font-family-', '').replace('font-', '');
                typography.fonts[fontName] = value;
            } else if (cleanProp.includes('font') && cleanProp.includes('size')) {
                const sizeName = cleanProp.replace('font-size-', '').replace('text-', '');
                typography.sizes[sizeName] = value;
            }
        });

        return typography;
    }

    // Extract border radius
    function extractBorderRadius(cssVars) {
        const radius = {};

        cssVars.borders.forEach(({ property, value }) => {
            if (property.includes('radius')) {
                const cleanProp = property.replace(/^--(?:tw-)?/, '').replace('border-radius-', '');
                radius[cleanProp] = value;
            }
        });

        return radius;
    }

    // Extract screen breakpoints
    function extractBreakpoints() {
        const breakpoints = {};
        const mediaQueries = [];

        // Look for Tailwind's responsive utilities in CSS
        const stylesheets = Array.from(document.styleSheets);
        stylesheets.forEach(sheet => {
            try {
                Array.from(sheet.cssRules).forEach(rule => {
                    if (rule.type === CSSRule.MEDIA_RULE) {
                        const mediaText = rule.media.mediaText;
                        if (mediaText.includes('min-width')) {
                            mediaQueries.push(mediaText);
                        }
                    }
                });
            } catch (e) {
                // Skip cross-origin stylesheets
            }
        });

        // Common Tailwind breakpoints
        const commonBreakpoints = {
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px'
        };

        // Try to extract from media queries
        mediaQueries.forEach(mq => {
            const match = mq.match(/min-width:\s*(\d+)px/);
            if (match) {
                const width = match[1] + 'px';
                // Find closest common breakpoint
                for (const [name, size] of Object.entries(commonBreakpoints)) {
                    if (size === width) {
                        breakpoints[name] = width;
                        break;
                    }
                }
            }
        });

        return breakpoints;
    }

    // Extract used Tailwind classes from the page with precision
    function extractUsedClasses() {
        const elements = document.querySelectorAll('*');
        const classes = new Set();

        // More precise Tailwind class patterns
        const tailwindClassPatterns = [
            // Layout & positioning
            /^container$/,
            /^flex$/,
            /^grid$/,
            /^hidden$/,
            /^block$/,
            /^inline$/,
            /^inline-block$/,
            /^absolute$/,
            /^relative$/,
            /^fixed$/,
            /^sticky$/,
            /^static$/,
            // Display utilities
            /^flex$/,
            /^grid$/,
            /^hidden$/,
            /^block$/,
            /^inline$/,
            /^inline-block$/,
            /^inline-flex$/,
            /^inline-grid$/,
            // Spacing
            /^p-\d+$/,
            /^m-\d+$/,
            /^px-\d+$/,
            /^py-\d+$/,
            /^mx-\d+$/,
            /^my-\d+$/,
            /^mt-\d+$/,
            /^mr-\d+$/,
            /^mb-\d+$/,
            /^ml-\d+$/,
            // Width/Height
            /^w-\d+$/,
            /^h-\d+$/,
            /^w-full$/,
            /^h-full$/,
            /^w-screen$/,
            /^h-screen$/,
            /^w-auto$/,
            /^h-auto$/,
            /^max-w-\w+$/,
            /^min-w-\w+$/,
            /^max-h-\w+$/,
            /^min-h-\w+$/,
            // Colors (Tailwind specific)
            /^bg-(red|blue|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)$/,
            /^bg-(white|black|transparent|current)$/,
            /^text-(red|blue|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)$/,
            /^text-(white|black|transparent|current)$/,
            /^border-(red|blue|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)$/,
            // Typography
            /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
            /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
            /^font-(sans|serif|mono)$/,
            /^leading-(3|4|5|6|7|8|9|10|none|tight|snug|normal|relaxed|loose)$/,
            /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
            // Borders
            /^rounded$/,
            /^rounded-(sm|md|lg|xl|2xl|3xl|full)$/,
            /^rounded-(t|r|b|l)-(sm|md|lg|xl|2xl|3xl|full)$/,
            /^border$/,
            /^border-(t|r|b|l)$/,
            /^border-\d+$/,
            // Shadows
            /^shadow$/,
            /^shadow-(sm|md|lg|xl|2xl|inner)$/,
            /^shadow-(black|white|gray|blue|red|green|yellow|purple|pink)\/\d+$/,
            // Effects
            /^opacity-\d+$/,
            /^blur$/,
            /^blur-(sm|md|lg|xl|2xl)$/,
            // Responsive prefixes
            /^(sm|md|lg|xl|2xl):/,
            // Dark mode
            /^dark:/,
            // Hover/Focus states
            /^hover:/,
            /^focus:/,
            /^active:/,
            /^disabled:/,
            // Z-index
            /^z-\d+$/,
            /^z-auto$/
        ];

        // Check all elements, not just first 100
        const elementsToCheck = Array.from(elements);

        elementsToCheck.forEach(el => {
            if (el.className && typeof el.className === 'string') {
                el.className.split(/\s+/).forEach(cls => {
                    if (cls && cls.trim()) {
                        // Check if it matches any Tailwind pattern
                        const isTailwindClass = tailwindClassPatterns.some(pattern =>
                            pattern.test(cls)
                        );

                        if (isTailwindClass) {
                            classes.add(cls);
                        }
                    }
                });
            }
        });

        // Also check for classes in data attributes and dynamic content
        const dataAttributes = document.querySelectorAll('[class]');
        dataAttributes.forEach(el => {
            if (el.className && typeof el.className === 'string') {
                el.className.split(/\s+/).forEach(cls => {
                    if (cls && cls.trim()) {
                        const isTailwindClass = tailwindClassPatterns.some(pattern =>
                            pattern.test(cls)
                        );

                        if (isTailwindClass) {
                            classes.add(cls);
                        }
                    }
                });
            }
        });

        return Array.from(classes).sort();
    }

    // Check for dark mode configuration
    function checkDarkMode() {
        const html = document.documentElement;
        const body = document.body;

        return {
            hasDarkMode: html.classList.contains('dark') || body.classList.contains('dark'),
            darkModeStrategy: html.hasAttribute('data-theme') ? 'data-theme' :
                            html.classList.contains('dark') ? 'class' : 'unknown'
        };
    }

    // Main extraction function
    function extractTailwindConfig() {
        const tailwindDetected = isTailwindLoaded();

        if (!tailwindDetected) {
            console.warn('⚠️  Tailwind CSS does not appear to be loaded on this page');
            console.log('🔄 Attempting fallback extraction anyway...');

            // Even if detection fails, try to extract what we can
            // (some sites might use Tailwind classes dynamically or in non-standard ways)
        } else {
            console.log('✅ Tailwind CSS detected');
        }

        const cssVars = extractCSSVariables();

        // If we have CSS variables, it's likely Tailwind or similar
        const hasAnyVars = Object.values(cssVars).some(group => group.length > 0);

        if (!tailwindDetected && !hasAnyVars) {
            console.log('❌ No Tailwind-related CSS variables found either');
            console.log('💡 This page may not be using Tailwind CSS, or it might be configured differently');
            return null;
        }

        if (!tailwindDetected && hasAnyVars) {
            console.log('🔍 Found CSS variables that might be Tailwind-related, proceeding with extraction...');
        }

        const config = {
            darkMode: checkDarkMode(),
            theme: {
                colors: extractTailwindColors(cssVars),
                spacing: extractSpacing(cssVars),
                typography: extractTypography(cssVars),
                borderRadius: extractBorderRadius(cssVars),
                screens: extractBreakpoints()
            },
            usedClasses: extractUsedClasses(),
            cssVariables: cssVars
        };

        return config;
    }

    // Display results with enhanced precision
    function displayResults(config) {
        if (!config) return;

        console.log('\n🎯 Tailwind CSS Configuration Extracted (High Precision):');
        console.log('=======================================================');

        // Summary with precision metrics
        const totalVars = Object.values(config.cssVariables || {}).reduce((sum, group) => sum + (group?.length || 0), 0);
        const totalCategories = Object.values(config.cssVariables || {}).filter(group => group?.length > 0).length;

        console.log(`📊 Precision Analysis:`);
        console.log(`   Total Tailwind Variables: ${totalVars}`);
        console.log(`   Active Categories: ${totalCategories}/8`);
        console.log(`   Verified Classes: ${config.usedClasses.length}`);

        // Version detection attempt
        const versionIndicators = detectTailwindVersion(config);
        if (versionIndicators.version) {
            console.log(`   Detected Version: ${versionIndicators.version} (${versionIndicators.confidence})`);
        }

        console.log('\n🌙 Dark Mode Configuration:');
        console.log(`   Strategy: ${config.darkMode.darkModeStrategy}`);
        console.log(`   Currently Active: ${config.darkMode.hasDarkMode}`);

        // Colors (enhanced display)
        if (config.cssVariables?.colors?.length > 0) {
            console.log('\n🎨 Color System Variables:');
            const colorGroups = groupColorsByType(config.cssVariables.colors);
            Object.entries(colorGroups).forEach(([type, colors]) => {
                console.log(`   ${type}:`);
                colors.slice(0, 8).forEach(({ property, value }) => {
                    console.log(`     ${property}: ${value}`);
                });
                if (colors.length > 8) {
                    console.log(`     ... and ${colors.length - 8} more ${type.toLowerCase()}`);
                }
            });
        }

        // Spacing (enhanced)
        if (config.cssVariables?.spacing?.length > 0) {
            console.log('\n📏 Spacing & Layout Variables:');
            const spacingByType = groupSpacingByType(config.cssVariables.spacing);
            Object.entries(spacingByType).forEach(([type, vars]) => {
                console.log(`   ${type}: ${vars.length} variables`);
            });
            // Show sample spacing values
            config.cssVariables.spacing.slice(0, 6).forEach(({ property, value }) => {
                console.log(`     ${property}: ${value}`);
            });
        }

        // Typography (enhanced)
        if (config.cssVariables?.typography?.length > 0) {
            console.log('\n📝 Typography System:');
            const typographyByType = groupTypographyByType(config.cssVariables.typography);
            Object.entries(typographyByType).forEach(([type, vars]) => {
                console.log(`   ${type}: ${vars.length} variables`);
                if (type === 'Font Families' && vars.length > 0) {
                    vars.slice(0, 3).forEach(({ property, value }) => {
                        console.log(`     ${property}: ${value}`);
                    });
                }
            });
        }

        // Layout utilities
        if (config.cssVariables?.layout?.length > 0) {
            console.log('\n📐 Layout Variables:');
            console.log(`   Size utilities: ${config.cssVariables?.layout?.length || 0} variables`);
            config.cssVariables.layout.slice(0, 4).forEach(({ property, value }) => {
                console.log(`     ${property}: ${value}`);
            });
        }

        // Effects & animations
        const effectsCount = (config.cssVariables?.effects?.length || 0) + (config.cssVariables?.animations?.length || 0);
        if (effectsCount > 0) {
            console.log('\n✨ Effects & Animations:');
            console.log(`   Shadow effects: ${config.cssVariables?.effects?.length || 0}`);
            console.log(`   Animation/Transition: ${config.cssVariables?.animations?.length || 0}`);
        }

        // Borders
        if (config.cssVariables?.borders?.length > 0) {
            console.log('\n🔲 Border & Radius System:');
            console.log(`   Border utilities: ${config.cssVariables?.borders?.length || 0} variables`);
        }

        console.log('\n📱 Responsive Breakpoints:');
        if (Object.keys(config.theme.screens).length > 0) {
            Object.entries(config.theme.screens).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        } else {
            console.log('   No custom breakpoints detected (using defaults)');
        }

        // Used classes with categorization
        if (config.usedClasses.length > 0) {
            console.log('\n🏷️  Verified Tailwind Classes:');
            const classCategories = categorizeClasses(config.usedClasses);

            Object.entries(classCategories).forEach(([category, classes]) => {
                if (classes.length > 0) {
                    console.log(`   ${category}: ${classes.length} classes`);
                    classes.slice(0, 8).forEach(cls => {
                        console.log(`     ${cls}`);
                    });
                    if (classes.length > 8) {
                        console.log(`     ... and ${classes.length - 8} more`);
                    }
                }
            });
        }

        console.log('\n💾 Detailed Variable Summary:');
        const summary = [
            `🎨 Colors: ${config.cssVariables?.colors?.length || 0}`,
            `📏 Spacing: ${config.cssVariables?.spacing?.length || 0}`,
            `📝 Typography: ${config.cssVariables?.typography?.length || 0}`,
            `📐 Layout: ${config.cssVariables?.layout?.length || 0}`,
            `✨ Effects: ${config.cssVariables?.effects?.length || 0}`,
            `🎭 Animations: ${config.cssVariables?.animations?.length || 0}`,
            `🔲 Borders: ${config.cssVariables?.borders?.length || 0}`,
            `❓ Other: ${config.cssVariables?.other?.length || 0}`
        ];
        summary.forEach(line => console.log(`   ${line}`));

        // Make config available globally for further inspection
        window.extractedTailwindConfig = config;
        console.log('\n🔍 Full config available as: window.extractedTailwindConfig');

        // Provide export functionality
        console.log('\n📤 Export Options:');
        console.log('   Copy to clipboard: copy(window.extractedTailwindConfig)');
        console.log('   Download as JSON: downloadTailwindConfig()');

        // Add enhanced download function
        window.downloadTailwindConfig = function() {
            const dataStr = JSON.stringify(config, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

            const exportFileDefaultName = `tailwind-config-${window.location.hostname}-${new Date().toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        };

        // Show precision indicators
        const precisionIndicators = [];
        if (config.usedClasses.length >= 10) precisionIndicators.push('High class usage');
        if (totalVars >= 20) precisionIndicators.push('Rich variable system');
        if (totalCategories >= 5) precisionIndicators.push('Complete design system');
        if (versionIndicators.version) precisionIndicators.push(`Version ${versionIndicators.version}`);

        if (precisionIndicators.length > 0) {
            console.log('\n🎯 Precision Indicators:', precisionIndicators.join(' • '));
        }
    }

    // Helper functions for enhanced categorization
    function groupColorsByType(colors) {
        return {
            'Primary Colors': colors.filter(c => c.property.includes('primary')),
            'Secondary Colors': colors.filter(c => c.property.includes('secondary')),
            'Semantic Colors': colors.filter(c => c.property.includes('destructive') || c.property.includes('muted') || c.property.includes('accent')),
            'Background/Foreground': colors.filter(c => c.property.includes('background') || c.property.includes('foreground')),
            'Ring/Border': colors.filter(c => c.property.includes('ring') || c.property.includes('border')),
            'Other Colors': colors.filter(c => !c.property.includes('primary') && !c.property.includes('secondary') &&
                                             !c.property.includes('destructive') && !c.property.includes('muted') && !c.property.includes('accent') &&
                                             !c.property.includes('background') && !c.property.includes('foreground') &&
                                             !c.property.includes('ring') && !c.property.includes('border'))
        };
    }

    function groupSpacingByType(spacing) {
        return {
            'Padding': spacing.filter(s => s.property.includes('p-') || s.property.includes('padding')),
            'Margin': spacing.filter(s => s.property.includes('m-') || s.property.includes('margin')),
            'Gap': spacing.filter(s => s.property.includes('gap')),
            'Space': spacing.filter(s => s.property.includes('space'))
        };
    }

    function groupTypographyByType(typography) {
        return {
            'Font Families': typography.filter(t => t.property.includes('font-family')),
            'Font Sizes': typography.filter(t => t.property.includes('font-size') || t.property.includes('text-')),
            'Line Heights': typography.filter(t => t.property.includes('leading')),
            'Letter Spacing': typography.filter(t => t.property.includes('tracking'))
        };
    }

    function categorizeClasses(classes) {
        return {
            'Layout': classes.filter(c => c.startsWith('flex') || c.startsWith('grid') || c.startsWith('block') || c.startsWith('hidden')),
            'Spacing': classes.filter(c => c.startsWith('p-') || c.startsWith('m-') || c.startsWith('space-')),
            'Colors': classes.filter(c => c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('border-')),
            'Typography': classes.filter(c => c.startsWith('text-') || c.startsWith('font-') || c.startsWith('leading-')),
            'Effects': classes.filter(c => c.startsWith('shadow') || c.startsWith('opacity') || c.startsWith('blur')),
            'Borders': classes.filter(c => c.startsWith('rounded') || c.startsWith('border')),
            'Responsive': classes.filter(c => /^(sm|md|lg|xl|2xl):/.test(c)),
            'States': classes.filter(c => c.startsWith('hover:') || c.startsWith('focus:') || c.startsWith('dark:'))
        };
    }

    function detectTailwindVersion(config) {
        // Version detection based on patterns
        const indicators = {
            'v4': ['--tw-', 'oklch(', 'container-query'],
            'v3': ['--tw-ring', 'hsl(', 'backdrop-blur'],
            'v2': ['--tw-shadow', 'rgb(', 'filter']
        };

        let bestMatch = null;
        let maxConfidence = 0;

        Object.entries(indicators).forEach(([version, patterns]) => {
            let confidence = 0;
            patterns.forEach(pattern => {
                // Check CSS variables
                const hasVar = Object.values(config.cssVariables || {}).some(group =>
                    group?.some(v => v.property.includes(pattern) || v.value.includes(pattern))
                );
                if (hasVar) confidence++;

                // Check classes
                const hasClass = config.usedClasses.some(cls => cls.includes(pattern.replace('--tw-', '')));
                if (hasClass) confidence++;
            });

            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                bestMatch = version;
            }
        });

        let confidence = 'Low';
        if (maxConfidence >= 4) confidence = 'High';
        else if (maxConfidence >= 2) confidence = 'Medium';

        return {
            version: bestMatch,
            confidence: confidence
        };
    }

    // Run extraction
    try {
        const config = extractTailwindConfig();
        displayResults(config);
    } catch (error) {
        console.error('❌ Error extracting Tailwind config:', error);
    }

    console.log('\n✨ Extraction complete!');
})();
