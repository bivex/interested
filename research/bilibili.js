Here's a comprehensive Tampermonkey userscript that translates Bilibili to Russian. I analyzed the page's main logic:

**Key Bilibili Page Structure:**
- **Navigation**: Top nav links (首页/番剧/直播/游戏中心 etc.)
- **Video title** (`h1` heading)
- **Video meta**: Views, date, author info, description
- **Player UI**: Controls (play/pause, quality, speed, settings, fullscreen, danmaku)
- **Interaction buttons**: Like (点赞), Coin (投币), Favorite (收藏), Share
- **Sidebar**: Recommended videos, danmaku list
- **Comments section**: dynamically loaded via custom elements (`bili-comments`)
- **Page uses Vue.js** SPA with dynamic DOM — so the script uses a `MutationObserver` to re-translate newly injected content.

```javascript
// ==UserScript==
// @name         Bilibili → Русский (полный перевод)
// @namespace    https://www.bilibili.com/
// @version      2.0
// @description  Переводит весь интерфейс Bilibili на русский язык. Охватывает навигацию, плеер, кнопки взаимодействия, боковую панель и динамически подгружаемый контент.
// @author       UserScript
// @match        https://www.bilibili.com/*
// @match        https://www.bilibili.com/video/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // 1. DICTIONARY  (Chinese → Russian)
    // ─────────────────────────────────────────────
    const DICT = [
        // ── Navigation ──
        ['首页',             '🏠 Главная'],
        ['番剧',             '🎞 Аниме/Сериалы'],
        ['直播',             '📡 Стримы'],
        ['游戏中心',         '🎮 Игры'],
        ['会员购',           '🛒 Магазин'],
        ['漫画',             '📖 Манга'],
        ['赛事',             '🏆 Соревнования'],
        ['下载客户端',       '⬇️ Скачать приложение'],

        // ── Auth ──
        ['登录',             'Войти'],
        ['注册',             'Регистрация'],
        ['大会员',           'Премиум'],
        ['消息',             'Сообщения'],
        ['动态',             'Новости'],
        ['收藏',             'Избранное'],
        ['历史',             'История'],
        ['创作中心',         'Студия создателя'],
        ['投稿',             'Загрузить'],

        // ── Player controls ──
        ['播放/暂停',         '▶️ Играть/Пауза'],
        ['全屏',              'Полный экран'],
        ['网页全屏',          'Полноэкранный режим'],
        ['宽屏',              'Широкий экран'],
        ['画中画',            'Картинка в картинке'],
        ['开启画中画',        'Включить картинку в картинке'],
        ['宽屏模式',          'Широкоэкранный режим'],
        ['进入全屏',          'Полный экран (f)'],
        ['网页全屏',          'На весь экран'],
        ['清晰度',            'Качество'],
        ['倍速',              'Скорость'],
        ['音量',              'Громкость'],
        ['设置',              'Настройки'],
        ['刷新',              'Обновить'],

        // ── Video quality ──
        ['4K 超高清',         '4K Ультра HD'],
        ['1080P 60帧',        '1080P 60 кадр/с'],
        ['1080P 高清',        '1080P HD'],
        ['720P 准高清',       '720P HD'],
        ['480P 标清',         '480P SD'],
        ['360P 流畅',         '360P Плавное'],
        ['自动',              'Авто'],
        ['自动(360P 流畅)',    'Авто (360P)'],
        ['登录即享',          'Войдите для доступа'],

        // ── Playback speed ──
        ['2.0x',   '2.0x'],
        ['1.5x',   '1.5x'],
        ['1.25x',  '1.25x'],
        ['1.0x',   '1.0x (норма)'],
        ['0.75x',  '0.75x'],
        ['0.5x',   '0.5x'],

        // ── Player settings ──
        ['镜像画面',           'Зеркало'],
        ['单集循环',           'Зациклить эпизод'],
        ['自动开播',           'Автовоспроизведение'],
        ['更多播放设置',       'Ещё настройки'],
        ['播放方式',           'Режим воспроизведения'],
        ['自动切集',           'Автопереход к след.'],
        ['播完暂停',           'Пауза после эпизода'],
        ['视频比例',           'Соотношение сторон'],
        ['播放策略',           'Стратегия декодирования'],
        ['默认',              'По умолчанию'],
        ['音量均衡',           'Выравнивание громкости'],
        ['标准',              'Стандарт'],
        ['高动态',            'Широкий диапазон'],
        ['关闭',              'Выкл'],
        ['其他设置',           'Прочие настройки'],
        ['隐藏黑边',           'Скрыть чёрные полосы'],
        ['关灯模式',           'Режим «Выключить свет»'],
        ['高能进度条',         'Тепловая карта прогресса'],
        ['恢复默认设置',       'Сбросить настройки'],
        ['优先使用播放器内置策略播放', 'Стратегия плеера по умолчанию'],
        ['优先使用 AV1 编码视频播放', 'Приоритет: AV1'],
        ['优先使用 HEVC/H.265 编码视频播放', 'Приоритет: HEVC/H.265'],
        ['优先使用 AVC/H.264 编码视频播放', 'Приоритет: AVC/H.264'],
        ['自动平衡不同视频间的音量大小', 'Авто-нормализация громкости'],
        ['平衡音量同时保留更多声音细节', 'Нормализация с сохранением деталей'],
        ['关闭音量均衡',       'Выкл. нормализацию'],

        // ── Danmaku (bullet comments) ──
        ['弹幕',               'Данмаку'],
        ['弹幕列表',           'Список данмаку'],
        ['弹幕显示隐藏',       'Показать/скрыть данмаку'],
        ['弹幕随屏幕缩放',     'Масштабировать данмаку'],
        ['防挡字幕',           'Не перекрывать субтитры'],
        ['智能防挡弹幕',       'Умное позиционирование'],
        ['弹幕观看屏蔽词',     'Стоп-слова данмаку'],
        ['同步屏蔽列表',       'Синхронизировать ЧС'],
        ['显示区域',           'Область отображения'],
        ['弹幕密度',           'Плотность данмаку'],
        ['不透明度',           'Прозрачность'],
        ['弹幕字号',           'Размер шрифта'],
        ['弹幕速度',           'Скорость прокрутки'],
        ['高级设置',           'Расширенные настройки'],
        ['全新【硬核会员弹幕模式】', '🔥 Режим жёсткого данмаку'],
        ['更多弹幕设置',       'Ещё настройки данмаку'],
        ['弹幕速度同步播放倍数', 'Скорость данмаку = скорость видео'],
        ['弹幕字体',           'Шрифт данмаку'],
        ['粗体',               'Жирный'],
        ['描边类型',           'Тип обводки'],
        ['重墨',               'Жирный контур'],
        ['描边',               'Обводка'],
        ['45°投影',            '45° тень'],
        ['屏蔽设定',           'Настройки блокировки'],
        ['高级弹幕',           'Продвинутый данмаку'],
        ['查看历史弹幕',       'Исторические данмаку'],
        ['弹幕列表填充中...',  'Загрузка данмаку...'],
        ['发个友善的弹幕见证当下', 'Написать данмаку...'],
        ['弹幕礼仪',           'Правила данмаку'],
        ['按类型过滤',         'Фильтр по типу'],
        ['滚动',               'Прокручивающиеся'],
        ['固定',               'Фиксированные'],
        ['彩色',               'Цветные'],
        ['高级',               'Продвинутые'],
        ['关闭弹幕 (d)',        'Скрыть данмаку (d)'],
        ['视频底部15%部分为空白保留区', 'Нижние 15% — зона без данмаку'],
        ['特殊颜色、运动形式的弹幕', 'Особые цвета и движение'],
        ['已装填 条弹幕',       'данмаку загружено'],
        ['人正在看',            'чел. смотрит'],

        // ── Interaction buttons ──
        ['点赞（Q）',          '👍 Лайк (Q)'],
        ['投币（W）',          '🪙 Монеты (W)'],
        ['收藏（E）',          '⭐ В избранное (E)'],
        ['分享',               '↗ Поделиться'],
        ['获取视频分享链接',   'Получить ссылку'],
        ['手机扫码观看/分享',  'QR-код для мобильного'],
        ['从开始分享',         'Поделиться с начала'],
        ['嵌入代码',           'Код встраивания'],
        ['稿件举报',           'Пожаловаться'],
        ['记笔记',             'Заметки'],
        ['还没有人发布笔记哦，快去发布一篇吧～', 'Пока нет заметок. Будьте первым!'],
        ['公开发布笔记',       'Опубликовать заметку'],

        // ── Mini player / misc ──
        ['用手机看',           '📱 Смотреть на телефоне'],
        ['稍后再看',           '🕐 Смотреть позже'],
        ['点击打开迷你播放器', 'Открыть мини-плеер'],
        ['作者声明：该内容仅供娱乐，请勿过分解读', '⚠️ Заявление автора: только для развлечения'],

        // ── Sidebar / recommendations ──
        ['接下来播放',         'Далее'],
        ['自动连播',           'Автовоспроизведение'],
        ['展开',               'Развернуть'],

        // ── Creator / uploader ──
        ['发消息',             '✉️ Сообщение'],
        ['充电',               '⚡ Поддержать'],
        ['关注',               '+ Подписаться'],

        // ── Ads / misc UI ──
        ['查看详情>>',         'Подробнее >>'],
        ['屏蔽广告',           'Скрыть рекламу'],
        ['（选择后将优化广告展示）', '(выбор улучшит подбор рекламы)'],
        ['不感兴趣',           'Не интересно'],
        ['相似内容过多',       'Слишком много похожего'],
        ['广告质量差',         'Плохая реклама'],
        ['我为什么会看到此广告', 'Почему вижу эту рекламу?'],
        ['我要投诉',           'Пожаловаться'],

        // ── Footer links ──
        ['帮助反馈',           'Помощь'],
        ['返回顶部',           '↑ Наверх'],
        ['赛事库',             'Соревнования'],
        ['课堂',               'Курсы'],
        ['小窗',               'Мини-окно'],
        ['客服',               'Поддержка'],
        ['顶部',               'Наверх'],

        // ── Error/info messages ──
        ['网络状况异常，请刷新后重试', '⚠️ Сетевая ошибка. Обновите страницу.'],
        ['正在缓冲...',        'Буферизация...'],
        ['为TA充电后即可观看', 'Поддержите автора для просмотра'],
        ['请先登录或注册',     'Войдите или зарегистрируйтесь'],

        // ── Comments section (bili-comments web component) ──
        ['评论',               'Комментарии'],
        ['条评论',             'комментариев'],
        ['发表评论',           'Написать комментарий'],
        ['按热度',             'По популярности'],
        ['按时间',             'По времени'],
        ['查看更多回复',       'Показать ответы'],
        ['回复',               'Ответить'],
        ['举报',               'Пожаловаться'],
        ['点赞',               'Лайк'],
        ['收起回复',           'Скрыть ответы'],
        ['查看更多',           'Ещё'],
        ['展开',               'Развернуть'],
        ['加载更多',           'Загрузить ещё'],
        ['删除',               'Удалить'],
        ['置顶',               '📌 Закрепить'],
        ['作者',               'Автор'],
        ['UP主',               'Автор'],

        // ── Search ──
        ['搜索',               '🔍 Поиск'],

        // ── Generic ──
        ['更多',               'Ещё'],
        ['播放',               'Воспроизведение'],
        ['暂停',               'Пауза'],
        ['发送',               'Отправить'],
    ];

    // ─────────────────────────────────────────────
    // 2. TRANSLATION ENGINE
    // ─────────────────────────────────────────────

    /**
     * Replace Chinese text inside a single TextNode.
     * Uses longest-match-first ordering (DICT is sorted by key length desc).
     */
    const sortedDict = [...DICT].sort((a, b) => b[0].length - a[0].length);

    function translateText(text) {
        let result = text;
        for (const [zh, ru] of sortedDict) {
            if (result.includes(zh)) {
                result = result.split(zh).join(ru);
            }
        }
        return result;
    }

    /**
     * Walk every TEXT_NODE inside `root` and translate it.
     * Skips <script>, <style>, <textarea>, the danmaku input.
     */
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE']);

    function translateNode(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
                    // Skip danmaku input field
                    if (parent.classList && parent.classList.contains('danmaku-box')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);

        for (const node of nodes) {
            const original = node.nodeValue;
            const translated = translateText(original);
            if (translated !== original) {
                node.nodeValue = translated;
            }
        }
    }

    /** Translate placeholder attributes */
    function translateAttributes(root) {
        const selectors = [
            'input[placeholder]',
            'textarea[placeholder]',
            '[title]',
            '[aria-label]',
        ];
        const elements = (root.querySelectorAll ? root : document)
            .querySelectorAll(selectors.join(','));

        for (const el of elements) {
            for (const attr of ['placeholder', 'title', 'aria-label']) {
                if (el.hasAttribute(attr)) {
                    const val = el.getAttribute(attr);
                    const translated = translateText(val);
                    if (translated !== val) el.setAttribute(attr, translated);
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    // 3. PAGE TITLE
    // ─────────────────────────────────────────────
    function translateTitle() {
        document.title = document.title.replace('哔哩哔哩_bilibili', 'Bilibili');
    }

    // ─────────────────────────────────────────────
    // 4. INITIAL PASS
    // ─────────────────────────────────────────────
    function runInitialTranslation() {
        translateNode(document.body);
        translateAttributes(document.body);
        translateTitle();
    }

    // ─────────────────────────────────────────────
    // 5. MUTATION OBSERVER — catches dynamic content
    //    (Vue SPA, bili-comments web component, etc.)
    // ─────────────────────────────────────────────
    let debounceTimer = null;
    const pendingNodes = new Set();

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) pendingNodes.add(node);
                if (node.nodeType === Node.TEXT_NODE) pendingNodes.add(node.parentElement || document.body);
            }
            // Also re-check modified text nodes
            if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
                const parent = m.target.parentElement;
                if (parent) pendingNodes.add(parent);
            }
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            for (const node of pendingNodes) {
                if (!node || !document.contains(node)) continue;
                translateNode(node);
                translateAttributes(node);
            }
            pendingNodes.clear();
            translateTitle();
        }, 150);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
    });

    // ─────────────────────────────────────────────
    // 6. SHADOW DOM — bili-comments uses shadow roots
    // ─────────────────────────────────────────────
    /**
     * Bilibili's comment section (`<bili-comments>`) is rendered inside a
     * Shadow DOM. We periodically check for shadow roots and attach observers.
     */
    const shadowsAttached = new WeakSet();

    function attachToShadowRoots(root = document) {
        const all = root.querySelectorAll('*');
        for (const el of all) {
            if (el.shadowRoot && !shadowsAttached.has(el.shadowRoot)) {
                shadowsAttached.add(el.shadowRoot);
                translateNode(el.shadowRoot);
                translateAttributes(el.shadowRoot);

                observer.observe(el.shadowRoot, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });

                // Recurse into nested shadow roots
                attachToShadowRoots(el.shadowRoot);
            }
        }
    }

    // Poll for shadow roots every 2 s for the first 30 s
    let shadowPollCount = 0;
    const shadowInterval = setInterval(() => {
        attachToShadowRoots();
        shadowPollCount++;
        if (shadowPollCount > 15) clearInterval(shadowInterval);
    }, 2000);

    // ─────────────────────────────────────────────
    // 7. KICK OFF
    // ─────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInitialTranslation);
    } else {
        runInitialTranslation();
    }

    // Extra pass after full page load (lazy-loaded components)
    window.addEventListener('load', () => {
        runInitialTranslation();
        attachToShadowRoots();
    });

})();
```

---

**How to install:**
1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Click **Create a new script** (the `+` tab).
3. Paste the entire script above, replacing the default template.
4. Press **Ctrl+S** to save.
5. Reload any `bilibili.com` page.

---

**What the script covers:**

| Area | Details |
|---|---|
| **Navigation bar** | All top-level links (Home, Anime, Live, Games, Shop, Manga…) |
| **Auth UI** | Login, Register, Premium badge, Messages, History |
| **Video player** | Quality levels, playback speed, all settings menus, danmaku controls |
| **Interaction bar** | Like, Coin, Favorite, Share, Report, Notes |
| **Creator card** | Subscribe, Support, Message |
| **Recommendations sidebar** | "Up next", autoplay toggle |
| **Comments section** | Handles the `<bili-comments>` **Shadow DOM** web component |
| **Placeholder/title/aria-label attributes** | Search bar, danmaku input |
| **Dynamic content** | MutationObserver re-translates all newly injected nodes (Vue SPA) |
| **Shadow DOM polling** | Periodically attaches observers to newly created shadow roots |
