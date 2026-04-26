// ==UserScript==
// @name         Freelancehunt Українська Типографія 2K
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Оптимізація української типографії для 2K/Retina дисплеїв + Safari фікси
// @author       .
// @match        https://freelancehunt.com/*
// @match        https://freelancehunt.com/ua/*
// @match        https://www.freelancehunt.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function() {
    'use strict';
    
    const style = document.createElement('style');
    style.id = 'ukrainian-typography-2k';
    
    style.textContent = `
        /* ===== УКРАЇНСЬКА ТИПОГРАФІЯ ДЛЯ 2K ДИСПЛЕЇВ ===== */
        
        /* Базові налаштування шрифтів для української */
        @supports (font-variant-ligatures: common-ligatures) {
            /* Включаємо стандартні лігатури та кернінг для української */
            html {
                font-variant-ligatures: common-ligatures !important;
                font-kerning: normal !important;
                font-feature-settings: "kern", "liga", "clig", "calt" !important;
                -webkit-font-feature-settings: "kern", "liga", "clig", "calt" !important;
            }
        }
        
        /* Професійна назва шрифтів для української (впорядковані за пріоритетом) */
        body, button, input, textarea, select {
            font-family: 
                "Montserrat", 
                "Montserrat Ukrainian", 
                "Montserrat Alternates", 
                "Noto Sans Ukrainian", 
                "Noto Sans", 
                "DejaVu Sans", 
                -apple-system, 
                BlinkMacSystemFont, 
                "Segoe UI", 
                Roboto, 
                "Helvetica Neue", 
                Arial, 
                sans-serif !important;
        }
        
        /* Покращене згладжування для 2K/Retina */
        @media 
          (min-width: 2560px), 
          (min-device-pixel-ratio: 1.5), 
          (min-resolution: 192dpi),
          (-webkit-min-device-pixel-ratio: 1.5) {
            
            html {
                /* Сильне згладжування для чітких контурів */
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                font-synthesis-weight: none !important;
                text-rendering: optimizeLegibility !important;
                -webkit-text-size-adjust: 100% !important;
                text-size-adjust: 100% !important;
                font-optical-sizing: auto !important;
            }
            
            /* Базовий розмір для 2K */
            html {
                font-size: 17px !important;
            }
            
            body {
                font-size: 16px !important;
                font-weight: 400 !important;
                line-height: 1.65 !important; /* Оптимально для українського */
                letter-spacing: 0.005em !important; /* Легкий інтерлігінг */
                word-spacing: 0.05em !important; /* Міжслівний інтервал */
            }
            
            /* Заголовки — більша висота рядка для українських букв */
            h1, h2, h3, h4, h5, h6,
            .h1, .h2, .h3, .h4, .h5, .h6,
            [class*="title"], [class*="heading"],
            .display-1, .display-2, .display-3,
            .title-lg, .title-md, .title-sm,
            .section-title, .page-title {
                font-weight: 600 !important;
                line-height: 1.25 !important;
                letter-spacing: -0.01em !important;
                word-spacing: 0.02em !important;
                -webkit-font-smoothing: subpixel-antialiased !important;
                
                /* Українські лігатури для заголовків */
                font-variant-ligatures: common-ligatures !important;
                font-kerning: normal !important;
            }
            
            h1, .h1, .display-1, .title-xl, [class*="title-1"] {
                font-size: clamp(30px, 3.2vw, 46px) !important;
                letter-spacing: -0.015em !important;
            }
            
            h2, .h2, .display-2, .title-lg, [class*="title-2"] {
                font-size: clamp(26px, 2.6vw, 38px) !important;
            }
            
            h3, .h3, .display-3, .title-md, [class*="title-3"] {
                font-size: clamp(22px, 2.1vw, 30px) !important;
            }
            
            h4, .h4, .title-sm, [class*="title-4"] {
                font-size: clamp(18px, 1.7vw, 24px) !important;
            }
            
            h5, .h5, [class*="title-5"] {
                font-size: clamp(16px, 1.4vw, 20px) !important;
            }
            
            h6, .h6, [class*="title-6"] {
                font-size: clamp(14px, 1.2vw, 18px) !important;
            }
            
            /* Основний текст — оптимізовано для української */
            p, .text, .content, span, div, .description, .subtitle {
                font-size: 16px !important;
                line-height: 1.7 !important; /* Для українського 1.65-1.7 ідеально */
                font-weight: 400 !important;
                letter-spacing: 0.003em !important;
                word-spacing: 0.03em !important;
                font-variant-ligatures: common-ligatures !important;
                font-kerning: normal !important;
                -webkit-font-smoothing: antialiased !important;
                -webkit-hyphens: auto !important;
                hyphens: auto !important;
                overflow-wrap: break-word !important;
                word-break: normal !important;
            }
            
            /* Джерела, підписи, невеликі тексти */
            small, .small, .caption, .label, .text-sm, .hint, .helper-text {
                font-size: 13.5px !important;
                line-height: 1.55 !important;
                letter-spacing: 0.001em !important;
                -webkit-font-smoothing: subpixel-antialiased !important;
            }
            
            /* Кнопки та елементи інтерфейсу */
            button, .btn, [role="button"], 
            input[type="button"], input[type="submit"], input[type="reset"],
            .btn-lg, .btn-md, .btn-sm, .btn-xs {
                font-family: inherit !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                line-height: 1.5 !important;
                letter-spacing: 0.015em !important; /* Для читабельності на кнопках */
                text-transform: none !important; /* Не перетворювати на верхній регістр */
                -webkit-font-smoothing: antialiased !important;
            }
            
            /* Навігація */
            nav, .nav, .menu, .navbar, .navigation, 
            .nav-link, .menu-item, .breadcrumb {
                font-size: 14.5px !important;
                font-weight: 500 !important;
                letter-spacing: 0.01em !important;
                line-height: 1.6 !important;
                -webkit-font-smoothing: subpixel-antialiased !important;
            }
            
            /* Карточки та контейнери */
            .card, [class*="card"], [class*="container"], 
            [class*="panel"], [class*="box"], .project-card,
            .vacancy-card, .profile-card {
                font-size: 15px !important;
                line-height: 1.65 !important;
            }
            
            /* Поля введення — важливо для української */
            input, textarea, select, 
            [class*="input"], [class*="field"], 
            .form-control, .form-input, .form-select {
                font-size: 16px !important;
                line-height: 1.55 !important;
                font-weight: 400 !important;
                font-family: inherit !important;
                letter-spacing: 0.002em !important;
                -webkit-font-smoothing: antialiased !important;
                font-kerning: normal !important;
            }
            
            /* Ціни, числа, статистика — моноширинне відображення цифр */
            [class*="price"], [class*="cost"], [class*="amount"], 
            .currency, .budget, .rate, .salary, 
            .statistic, .counter, .number {
                font-variant-numeric: tabular-nums lining-nums !important;
                font-feature-settings: "tnum", "lnum" !important;
                -webkit-font-feature-settings: "tnum", "lnum" !important;
                -webkit-font-smoothing: subpixel-antialiased !important;
                letter-spacing: 0.01em !important;
            }
            
            /* Українські тексти — підвищена чіткість */
            [lang="uk"], [lang="ua"], [lang*="uk"], [lang*="ua"],
            .ukrainian, .ua-text, [class*="ukrainian"] {
                font-kerning: normal !important;
                font-variant-ligatures: common-ligatures !important;
                font-feature-settings: "kern", "liga", "clig", "calt" !important;
                -webkit-font-feature-settings: "kern", "liga", "clig", "calt" !important;
                -webkit-font-smoothing: antialiased !important;
                text-rendering: optimizeLegibility !important;
                letter-spacing: 0.004em !important; /* Для українських букв і, ї, є, ґ */
            }
            
            /* Специфічні українські літери — оптимізуємо міжлітерний інтервал */
            .ukrainian-text i, .ukrainian-text і,
            .ukrainian-text ї, .ukrainian-text є,
            .ukrainian-text І, .ukrainian-text Ї,
            .ukrainian-text Є, .ukrainian-text Ґ,
            p:has(і), p:has(ї), p:has(є), p:has(І), p:has(Ї), p:has(Є),
            span:has(і), span:has(ї), span:has(є),
            div:has(і), div:has(ї), div:has(є) {
                letter-spacing: 0.006em !important;
            }
            
            /* Код та моноширинні шрифти */
            code, pre, [class*="code"], [class*="pre"], 
            .code-block, .snippet, .terminal {
                font-family: 
                    "SF Mono", 
                    "Monaco", 
                    "Consolas", 
                    "Liberation Mono", 
                    "DejaVu Sans Mono", 
                    "Courier New", 
                    monospace !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
                -webkit-font-smoothing: subpixel-antialiased !important;
                text-rendering: optimizeSpeed !important;
            }
            
            /* Цифри — особливо важливо для українських документів */
            .number, .digit, [class*="number"], [class*="digit"] {
                font-variant-numeric: tabular-nums proportional-nums !important;
                font-feature-settings: "tnum", "pnum" !important;
                -webkit-font-feature-settings: "tnum", "pnum" !important;
            }
            
            /* Списки — інтерлігінг для читабельності */
            ul, ol, li, dl, dt, dd {
                line-height: 1.7 !important;
                -webkit-font-smoothing: antialiased !important;
            }
            
            /* Citations, цитати, блоки цитат */
            blockquote, q, cite, .quote, .testimonial {
                font-style: italic !important;
                line-height: 1.75 !important;
                letter-spacing: 0.002em !important;
                font-kerning: normal !important;
            }
            
            /* Гіперпосилання — підкреслення для чіткості */
            a, .link, [role="link"] {
                text-decoration-skip-ink: auto !important;
                -webkit-text-decoration-skip: ink !important;
                text-decoration-thickness: 1.5px !important;
                text-underline-offset: 2px !important;
                font-kerning: normal !important;
            }
        }
        
        /* ===== СПЕЦІАЛЬНІ ПРАВИЛА ДЛЯ УКРАЇНСЬКИХ БУКВ ===== */
        
        /* Чіткіші контури для специфічних українських літер */
        @media (min-width: 2560px) {
            і, ї, є, І, Ї, Є, Ґ, ґ,
            p:has(і), p:has(ї), p:has(є),
            span:has(і), span:has(ї), span:has(є),
            div:has(і), div:has(ї), div:has(є) {
                -webkit-font-smoothing: antialiased !important;
                -webkit-text-stroke: 0.3px transparent !important;
                text-shadow: 0 0 0.5px rgba(0,0,0,0.1) !important;
            }
        }
        
        /* Підвищена висота рядка для українських заголовків */
        .uk-title, .uk-heading, 
        h1.uk, h2.uk, h3.uk,
        .title[lang="uk"], .heading[lang="uk"] {
            line-height: 1.3 !important;
            margin-bottom: 0.8em !important;
        }
        
        /* Для довгі-text українською мовою — більше інтерлігіну */
        .uk-content, .uk-text, 
        .article-body[lang="uk"], 
        .description[lang="uk"] {
            line-height: 1.75 !important;
            max-width: 75ch !important; /* Оптимальна ширина для читання */
        }
        
        /* Відступи між абзацами для української */
        [lang="uk"] p, [lang="ua"] p {
            margin-bottom: 1.2em !important;
        }
        
        /* Тіні для кращої відділення українського тексту */
        @media (min-width: 2000px) {
            [lang="uk"] {
                text-shadow: 
                    0 0 1px rgba(255, 255, 255, 0.3),
                    0 0 2px rgba(255, 255, 255, 0.1) !important;
            }
        }
        
        /* ===== ДИНАМІЧНА ОПТИМІЗАЦІЯ ДЛЯ 2K ===== */
        
        /* Адаптивні розміри залежно від ширини екрану */
        @media (min-width: 2560px) {
            :root {
                --base-font-size: 18px;
                --heading-factor: 1.2;
            }
        }
        
        @media (min-width: 3000px) {
            :root {
                --base-font-size: 19px;
                --heading-factor: 1.25;
            }
        }
        
        /* При multicategory viewports */
        @media (min-width: 2560px) and (max-width: 3440px) {
            body {
                font-size: clamp(15px, 1vw, 18px) !important;
            }
            
            h1 { font-size: clamp(32px, 2.5vw, 52px) !important; }
            h2 { font-size: clamp(28px, 2.2vw, 42px) !important; }
            h3 { font-size: clamp(24px, 1.8vw, 34px) !important; }
        }
        
        /* Для ультрашироких екранів — обмежуємо максимальний розмір */
        @media (min-width: 4000px) {
            body {
                max-width: 90vw;
                margin: 0 auto;
            }
            
            p, .text, .content {
                max-width: 85ch;
                margin-left: auto;
                margin-right: auto;
            }
        }
        
        /* ===== САФАРІ ФІКСИ (попередні) ===== */
        
        /* 1. Fix button appearance in Safari */
        .btn.btn-white-stroke.keep-site-language.language-selector-item,
        .language-bar__dismiss.language-selector-item {
            -webkit-appearance: none !important;
            appearance: none !important;
            -webkit-border-radius: 9999px !important;
            border-radius: 9999px !important;
            border: 1px solid #ffffff !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-font-smoothing: antialiased !important;
        }
        
        /* 2. Remove Safari tap highlight */
        a, button, .btn, [role="button"], [onclick], input, select, textarea {
            -webkit-tap-highlight-color: transparent;
            tap-highlight-color: transparent;
        }
        
        /* 3. Form button styling fix */
        button, input[type="submit"], input[type="button"], input[type="reset"] {
            -webkit-appearance: none;
            -webkit-user-select: none;
            user-select: none;
        }
        
        /* 4. High z-index GPU acceleration */
        [style*="z-index: 16777000"],
        [style*="z-index:16777000"] {
            -webkit-transform: translateZ(0) !important;
            transform: translateZ(0) !important;
            will-change: transform !important;
        }
        
        /* 5. Fixed elements */
        [style*="position: fixed"],
        .fixed, .navbar, .header, nav, .sticky {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            -webkit-transform: translate3d(0, 0, 0);
            -webkit-font-smoothing: antialiased !important;
        }
        
        /* 6. Modals */
        .modal, .overlay, [role="dialog"] {
            -webkit-overflow-scrolling: touch;
        }
        
        /* 7. Images */
        img {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            image-rendering: -webkit-optimize-contrast;
            -webkit-transform: translateZ(0);
        }
        
        /* 8. Text size adjust prevention */
        html {
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
            overflow-anchor: none !important;
        }
        
        /* 9. Focus rings */
        *:focus {
            outline: 2px solid #2fb571 !important;
            outline-offset: 2px !important;
        }
        
        *:focus:not(:focus-visible) {
            outline: none !important;
        }
        
        *:focus-visible {
            outline: 2px solid #2fb571 !important;
            outline-offset: 2px !important;
        }
        
        /* 10. Selection */
        ::selection {
            background: rgba(47, 181, 113, 0.3);
        }
        
        /* 11. Smooth scrolling */
        html {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
        }
        
        /* 12. Scrollbars for 2K */
        @media (min-width: 2560px) {
            ::-webkit-scrollbar {
                width: 10px !important;
                height: 10px !important;
            }
            
            ::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05) !important;
                border-radius: 5px !important;
            }
            
            ::-webkit-scrollbar-thumb {
                background: rgba(47, 181, 113, 0.6) !important;
                border-radius: 5px !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
        }
        
        /* 13. Form inputs clear buttons */
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-decoration {
            -webkit-appearance: none;
            display: none;
        }
        
        /* 14. Number inputs */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        
        /* 15. Prevent button jitter */
        button, .btn {
            -webkit-transition: -webkit-transform 0.15s ease-out !important;
            transition: transform 0.15s ease-out !important;
            transform: translateZ(0) !important;
        }
        
        /* ===== ДОДАТКОВІ ФІКСИ ДЛЯ УКРАЇНСЬКОЇ ТИПОГРАФІКИ ===== */
        
        /* Fix diacritical marks positioning */
        @media (min-device-pixel-ratio: 1.5) {
            [lang="uk"] i, 
            [lang="uk"] ї, 
            [lang="uk"] є,
            [lang="uk"] І,
            [lang="uk"] Ї,
            [lang="uk"] Є,
            [lang="uk"] Ґ {
                vertical-align: baseline !important;
                line-height: normal !important;
            }
        }
        
        /* Optional: Enable hyphenation for Ukrainian */
        @supports (hyphens: auto) {
            [lang="uk"] {
                hyphens: auto !important;
                -webkit-hyphens: auto !important;
                hyphenate-limit-chars: 6 3 3 !important;
                hyphenate-limit-lines: 2 !important;
                hyphenate-limit-last: always !important;
                hyphenate-limit-zone: 8% !important;
            }
        }
    `;
    
    // Inject CSS
    const injectCSS = () => {
        if (document.head) {
            document.head.appendChild(style);
            console.log('[UA Typography 2K] CSS injected successfully');
        } else {
            document.head = document.documentElement.appendChild(document.createElement('head'));
            document.head.appendChild(style);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCSS);
    } else {
        injectCSS();
    }
    
    // Dynamic content observer for Ukrainian text
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Apply Ukrainian typography fixes to new elements
                    if (node.textContent && /[іІїЇєЄ]/.test(node.textContent)) {
                        node.style.setProperty('font-kerning', 'normal', 'important');
                        node.style.setProperty('-webkit-font-smoothing', 'antialiased', 'important');
                        
                        // If it's a text container
                        if (node.matches('p, h1, h2, h3, h4, h5, h6, span, div, li')) {
                            node.style.setProperty('font-feature-settings', '"kern", "liga", "clig"', 'important');
                            node.style.setProperty('-webkit-font-feature-settings', '"kern", "liga", "clig"', 'important');
                        }
                    }
                    
                    // Fix buttons
                    if (node.matches('button, [role="button"]') || 
                        (node.classList && node.classList.contains('btn'))) {
                        node.style.setProperty('-webkit-appearance', 'none', 'important');
                        node.style.setProperty('-webkit-font-smoothing', 'antialiased', 'important');
                        node.style.setProperty('letter-spacing', '0.015em', 'important');
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Log success
    console.log('[UA Typography 2K] Userscript loaded for Ukrainian language');
    console.log('[UA Typography 2K] Optimized for 2K displays: ' + (window.screen.width >= 2560));
})();
