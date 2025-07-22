// ==UserScript==
// @name         YouTube コメントと返信を自動展開 ✅
// @name:en      YouTube Auto Expand Comments and Replies ✅
// @name:ja      YouTube コメントと返信を自動展開 ✅
// @name:zh-CN   自动展开 YouTube 评论与回复 ✅
// @name:zh-TW   自動展開 YouTube 評論與回覆 ✅
// @name:ko      YouTube 댓글 및 답글 자동 확장 ✅
// @name:fr      Déploiement automatique des commentaires YouTube ✅
// @name:es      Expansión automática de comentarios de YouTube ✅
// @name:de      YouTube-Kommentare automatisch erweitern ✅
// @name:pt-BR   Expandir automaticamente os comentários do YouTube ✅
// @name:ru      Авторазворачивание комментариев на YouTube ✅
// @version      3.7.0
// @description         安定動作でYouTubeのコメントと返信、「他の返信を表示」も自動展開！現行UIに完全対応。コピー機能付き（全コメント一括コピー対応）。
// @description:en      Reliably auto-expands YouTube comments, replies, and "Show more replies". Fully updated for current UI. With copy functionality including copy all comments.
// @description:zh-CN   稳定展开YouTube评论和回复，包括"显示更多回复"。兼容新界面。带复制功能（支持一键复制所有评论）。
// @description:zh-TW   穩定展開YouTube評論和回覆，包括「顯示更多回覆」。支援最新介面。附複製功能（支援一鍵複製所有評論）。
// @description:ko      YouTube의 댓글과 답글을 안정적으로 자동 확장. 최신 UI에 대응. 복사 기능 포함（전체 댓글 일괄 복사 지원）.
// @description:fr      Déploie automatiquement les commentaires et réponses YouTube. Compatible avec la nouvelle interface. Avec fonction copie (copie de tous les commentaires).
// @description:es      Expande automáticamente los comentarios y respuestas en YouTube. Totalmente actualizado para la nueva interfaz. Con función de copia (copia todos los comentarios).
// @description:de      Erweiterung von YouTube-Kommentaren und Antworten – automatisch und zuverlässig. Für aktuelle Oberfläche optimiert. Mit Kopierfunktion (alle Kommentare kopieren).
// @description:pt-BR   Expande automaticamente comentários e respostas no YouTube. Compatível com a nova UI. Com função de cópia (copiar todos os comentários).
// @description:ru      Автоматически разворачивает комментарии и ответы на YouTube. Полностью адаптирован к новому интерфейсу. С функцией копирования (копировать все комментарии).
// @namespace    https://github.com/koyasi777/youtube-auto-expand-comments
// @author       koyasi777
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @run-at       document-end
// @license      MIT
// @homepageURL  https://github.com/koyasi777/youtube-auto-expand-comments
// @supportURL   https://github.com/koyasi777/youtube-auto-expand-comments/issues
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        INITIAL_DELAY: 1500,
        CLICK_INTERVAL: 500,
        EXPANDED_CLASS: 'yt-auto-expanded',
        COPY_BUTTON_CLASS: 'yt-copy-comment-btn',
        COPY_ALL_BUTTON_CLASS: 'yt-copy-all-btn',
        COPY_ALL_CONTAINER_CLASS: 'yt-copy-all-container',
        DEBUG: true
    };

    const SELECTORS = {
        COMMENTS: 'ytd-comments#comments',
        COMMENT_THREAD: 'ytd-comment-thread-renderer',
        COMMENT_CONTENT: '#content-text',
        COMMENT_AUTHOR: '#author-text',
        COMMENT_TIME: 'a.yt-simple-endpoint time',
        COMMENTS_HEADER: 'ytd-comments-header-renderer',
        MORE_COMMENTS: 'ytd-continuation-item-renderer #button:not([disabled])',
        SHOW_REPLIES: '#more-replies > yt-button-shape > button:not([disabled])',
        HIDDEN_REPLIES: 'ytd-comment-replies-renderer ytd-button-renderer#more-replies button:not([disabled])',
        CONTINUATION_REPLIES: 'ytd-comment-replies-renderer ytd-continuation-item-renderer ytd-button-renderer button:not([disabled])',
        READ_MORE: 'tp-yt-paper-button#more[aria-expanded="false"]:not([aria-disabled="true"])'
    };

    // Add CSS styles for copy buttons
    const addStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .${CONFIG.COPY_BUTTON_CLASS} {
                background: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 4px 8px;
                margin-left: 8px;
                font-size: 12px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s;
                color: #606060;
            }
            .${CONFIG.COPY_BUTTON_CLASS}:hover {
                background: #e0e0e0;
                color: #000;
            }
            .${CONFIG.COPY_BUTTON_CLASS}.copied {
                background: #4caf50;
                color: white;
                border-color: #45a049;
            }
            .${CONFIG.COPY_BUTTON_CLASS} {
                font-size: 14px;
            }

            .${CONFIG.COPY_ALL_CONTAINER_CLASS} {
                position: fixed;
                bottom: 20px;
                right: 20px;
                margin: 0;
                padding: 12px;
                background: rgba(248, 249, 250, 0.9);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                border: 1px solid rgba(224, 224, 224, 0.8);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                max-width: 350px;
            }

            .${CONFIG.COPY_ALL_CONTAINER_CLASS}:hover {
                background: rgba(248, 249, 250, 0.95);
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
            }

            .${CONFIG.COPY_ALL_BUTTON_CLASS} {
                background: #1976d2;
                color: white;
                border: none;
                border-radius: 18px;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .${CONFIG.COPY_ALL_BUTTON_CLASS}:hover {
                background: #1565c0;
                transform: translateY(-1px);
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            }
            .${CONFIG.COPY_ALL_BUTTON_CLASS}.loading {
                opacity: 0.7;
                cursor: wait;
            }
            .${CONFIG.COPY_ALL_BUTTON_CLASS}.copied {
                background: #4caf50;
            }
            .${CONFIG.COPY_ALL_BUTTON_CLASS} {
                font-size: 16px;
            }

            .copy-all-info {
                font-size: 13px;
                color: #606060;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .copy-all-dropdown {
                position: relative;
                display: inline-block;
            }

            .copy-all-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 200px;
                z-index: 10000;
                margin-top: 4px;
            }

            .copy-all-menu-item {
                padding: 12px 16px;
                cursor: pointer;
                font-size: 14px;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.2s;
            }

            .copy-all-menu-item:hover {
                background: #f5f5f5;
            }

            .copy-all-menu-item:last-child {
                border-bottom: none;
                border-radius: 0 0 8px 8px;
            }

            .copy-all-menu-item:first-child {
                border-radius: 8px 8px 0 0;
            }

            .copy-all-menu-item {
                font-size: 16px;
            }

            [dark] .${CONFIG.COPY_BUTTON_CLASS} {
                background: #2a2a2a;
                border-color: #555;
                color: #aaa;
            }
            [dark] .${CONFIG.COPY_BUTTON_CLASS}:hover {
                background: #3a3a3a;
                color: #fff;
            }

            [dark] .${CONFIG.COPY_ALL_CONTAINER_CLASS} {
                background: rgba(26, 26, 26, 0.9);
                border-color: rgba(51, 51, 51, 0.8);
            }

            [dark] .${CONFIG.COPY_ALL_CONTAINER_CLASS}:hover {
                background: rgba(26, 26, 26, 0.95);
            }

            [dark] .copy-all-info {
                color: #aaa;
            }

            [dark] .copy-all-menu {
                background: #2a2a2a;
                border-color: #555;
            }

            [dark] .copy-all-menu-item {
                color: #fff;
                border-bottom-color: #333;
            }

            [dark] .copy-all-menu-item:hover {
                background: #3a3a3a;
            }

            [dark] .${CONFIG.COPY_ALL_CONTAINER_CLASS} button[style*="background: #666"] {
                background: #888 !important;
            }

            [dark] .${CONFIG.COPY_ALL_CONTAINER_CLASS} button[style*="background: #4caf50"] {
                background: #66bb6a !important;
            }
        `;
        document.head.appendChild(style);
    };

    // Icons - Using text-based alternatives to avoid TrustedHTML issues
    const copyIcon = '📋';
    const checkIcon = '✅';
    const downloadIcon = '⬇️';
    const listIcon = '📝';
    const cleanIcon = '✨';

    class YouTubeCommentExpander {
        constructor() {
            this.observer = null;
            this.io = null;
            this.ioTargets = [];
            this.ioControlInterval = null;
            this.expandedComments = new Set();
            this.autoClickPaused = false;
            this.resumeTimer = null;
            this.copyButtonsAdded = new Set();
            this.copyAllButtonAdded = false;
        }

        log(...args) {
            if (CONFIG.DEBUG) console.log('[YTCExpander]', ...args);
        }

        // Copy functionality methods
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return true;
                } catch (e) {
                    document.body.removeChild(textArea);
                    return false;
                }
            }
        }

        async downloadAsFile(content, filename) {
            try {
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return true;
            } catch (e) {
                this.log('Download error:', e);
                return false;
            }
        }

        getCommentText(commentElement) {
            const author = commentElement.querySelector(SELECTORS.COMMENT_AUTHOR)?.textContent?.trim() || 'Unknown';
            const content = commentElement.querySelector(SELECTORS.COMMENT_CONTENT)?.textContent?.trim() || '';
            const timeElement = commentElement.querySelector(SELECTORS.COMMENT_TIME);
            const time = timeElement?.getAttribute('datetime') || timeElement?.textContent?.trim() || '';

            return {
                author,
                content,
                time,
                formatted: `${author}${time ? ` (${time})` : ''}:\n${content}`
            };
        }

        async getAllComments() {
            const comments = [];
            const videoTitle = document.title.replace(' - YouTube', '');

            // First, expand all hidden replies to make sure we capture everything
            await this.expandAllReplies();



            // Get main comments
            const commentThreads = document.querySelectorAll(`${SELECTORS.COMMENT_THREAD}`);
            this.log(`Found ${commentThreads.length} comment threads`);

            commentThreads.forEach((thread, threadIndex) => {
                // Main comment
                const mainComment = thread.querySelector('#main');
                if (mainComment) {
                    const commentData = this.getCommentText(mainComment);
                    // Check if this main comment is already added
                    const isAlreadyAdded = comments.some(c =>
                        c.author === commentData.author &&
                        c.content === commentData.content &&
                        c.type === 'comment'
                    );

                    if (!isAlreadyAdded) {
                    comments.push({
                        type: 'comment',
                        ...commentData,
                        level: 0
                    });
                        this.log(`Added main comment ${threadIndex + 1}: ${commentData.author}`);
                    } else {
                        this.log(`Skipped duplicate main comment: ${commentData.author}`);
                    }
                }

                // Replies - try multiple approaches to find all replies
                let replyCount = 0;

                // Method 1: Look for reply containers
                const replyContainers = thread.querySelectorAll('ytd-comment-replies-renderer');
                this.log(`Thread ${threadIndex + 1}: Found ${replyContainers.length} reply containers`);

                replyContainers.forEach((container, containerIndex) => {
                    // Get all replies in this container - look for ytd-comment-view-model with is-reply attribute
                    const replies = container.querySelectorAll('ytd-comment-view-model[is-reply]');
                    this.log(`Container ${containerIndex + 1}: Found ${replies.length} replies with is-reply attribute`);

                    replies.forEach((reply, replyIndex) => {
                    const replyData = this.getCommentText(reply);
                        // Check if this reply is already added
                        const isAlreadyAdded = comments.some(c =>
                            c.author === replyData.author &&
                            c.content === replyData.content &&
                            c.type === 'reply'
                        );

                        if (!isAlreadyAdded) {
                    comments.push({
                        type: 'reply',
                        ...replyData,
                        level: 1
                    });
                            replyCount++;
                            this.log(`Added reply ${replyIndex + 1} in container ${containerIndex + 1}: ${replyData.author}`);
                        } else {
                            this.log(`Skipped duplicate reply: ${replyData.author}`);
                        }
                    });

                    // Also try looking for any ytd-comment-view-model in the contents div
                    const contentsDiv = container.querySelector('#contents');
                    if (contentsDiv) {
                        const contentReplies = contentsDiv.querySelectorAll('ytd-comment-view-model');
                        this.log(`Container ${containerIndex + 1}: Found ${contentReplies.length} replies in contents div`);

                        contentReplies.forEach((reply, replyIndex) => {
                            const replyData = this.getCommentText(reply);
                            // Check if this reply is already added
                            const isAlreadyAdded = comments.some(c =>
                                c.author === replyData.author &&
                                c.content === replyData.content &&
                                c.type === 'reply'
                            );

                            if (!isAlreadyAdded) {
                                comments.push({
                                    type: 'reply',
                                    ...replyData,
                                    level: 1
                                });
                                replyCount++;
                                this.log(`Added additional reply ${replyIndex + 1} from contents div: ${replyData.author}`);
                            } else {
                                this.log(`Skipped duplicate reply from contents div: ${replyData.author}`);
                            }
                        });
                    }
                });

                // Method 2: Look for replies directly in the thread (fallback)
                if (replyCount === 0) {
                    const directReplies = thread.querySelectorAll('ytd-comment-view-model[is-reply]');
                    this.log(`Thread ${threadIndex + 1}: Found ${directReplies.length} direct replies with is-reply (fallback)`);

                    directReplies.forEach((reply, replyIndex) => {
                        const replyData = this.getCommentText(reply);
                        // Check if this reply is already added
                        const isAlreadyAdded = comments.some(c =>
                            c.author === replyData.author &&
                            c.content === replyData.content &&
                            c.type === 'reply'
                        );

                        if (!isAlreadyAdded) {
                            comments.push({
                                type: 'reply',
                                ...replyData,
                                level: 1
                            });
                            this.log(`Added direct reply ${replyIndex + 1}: ${replyData.author}`);
                        } else {
                            this.log(`Skipped duplicate direct reply: ${replyData.author}`);
                        }
                    });
                }

                // Method 3: Look for any comment elements that might be replies
                const nonMainComments = thread.querySelectorAll('ytd-comment-view-model[is-reply]');
                if (nonMainComments.length > replyCount) {
                    this.log(`Thread ${threadIndex + 1}: Found ${nonMainComments.length} reply elements with is-reply`);
                    nonMainComments.forEach((reply, replyIndex) => {
                        const replyData = this.getCommentText(reply);
                        const isAlreadyAdded = comments.some(c =>
                            c.author === replyData.author &&
                            c.content === replyData.content &&
                            c.type === 'reply'
                        );
                        if (!isAlreadyAdded) {
                            comments.push({
                                type: 'reply',
                                ...replyData,
                                level: 1
                            });
                            this.log(`Added additional reply ${replyIndex + 1}: ${replyData.author}`);
                        } else {
                            this.log(`Skipped duplicate additional reply: ${replyData.author}`);
                        }
                    });
                }

                // Method 4: Look for any elements that might contain replies (most aggressive)
                const allPossibleReplies = thread.querySelectorAll('[id*="reply"], [class*="reply"], [data-testid*="reply"]');
                this.log(`Thread ${threadIndex + 1}: Found ${allPossibleReplies.length} possible reply elements`);

                allPossibleReplies.forEach((element, elementIndex) => {
                    if (!element.hasAttribute('is-reply')) return;
                    // Try to find comment content in this element
                    const authorElement = element.querySelector('#author-text, [class*="author"], [data-testid*="author"]');
                    const contentElement = element.querySelector('#content-text, [class*="content"], [data-testid*="content"]');
                    if (authorElement && contentElement) {
                        const author = authorElement.textContent?.trim() || 'Unknown';
                        const content = contentElement.textContent?.trim() || '';
                        if (content && author !== 'Unknown') {
                            // Check if this reply is already added
                            const isAlreadyAdded = comments.some(c =>
                                c.author === author &&
                                c.content === content &&
                                c.type === 'reply'
                            );
                            if (!isAlreadyAdded) {
                                comments.push({
                                    type: 'reply',
                                    author,
                                    content,
                                    time: '',
                                    formatted: `${author}:\n${content}`,
                                    level: 1
                                });
                                this.log(`Added aggressive reply ${elementIndex + 1}: ${author}`);
                            } else {
                                this.log(`Skipped duplicate aggressive reply: ${author}`);
                            }
                        }
                    }
                });
            });

            this.log(`Total comments collected: ${comments.length} (${comments.filter(c => c.type === 'comment').length} main, ${comments.filter(c => c.type === 'reply').length} replies)`);

            return {
                videoTitle,
                comments,
                totalCount: comments.length
            };
        }

        async expandAllReplies() {
            // Temporarily pause auto-click to avoid conflicts
            const wasPaused = this.autoClickPaused;
            this.autoClickPaused = true;

            try {
                this.log('Starting to expand all replies...');

                // Click all "Show more replies" buttons
                const showMoreButtons = document.querySelectorAll(
                    `${SELECTORS.SHOW_REPLIES}, ${SELECTORS.HIDDEN_REPLIES}, ${SELECTORS.CONTINUATION_REPLIES}`
                );

                this.log(`Found ${showMoreButtons.length} buttons to click`);

                for (const button of showMoreButtons) {
                    if (!button.disabled && button.getAttribute('aria-expanded') !== 'true') {
                        try {
                            button.click();
                            this.log('Clicked reply expansion button');
                        } catch (e) {
                            this.log('Error expanding replies:', e);
                        }
                    }
                }

                // Also try clicking any button that contains "reply" or "more" text
                const allButtons = document.querySelectorAll('button');
                const replyButtons = Array.from(allButtons).filter(btn => {
                    const text = btn.textContent.toLowerCase();
                    return (text.includes('reply') || text.includes('more') || text.includes('ответ')) &&
                           !btn.disabled &&
                           btn.getAttribute('aria-expanded') !== 'true';
                });

                this.log(`Found ${replyButtons.length} additional reply buttons`);

                for (const button of replyButtons) {
                    try {
                        button.click();
                        this.log('Clicked additional reply button');
                    } catch (e) {
                        this.log('Error clicking additional reply button:', e);
                    }
                }

            } finally {
                // Restore previous auto-click state
                this.autoClickPaused = wasPaused;
                this.log('Finished expanding replies');
            }
        }

        async formatAllComments(format = 'plain') {
            const data = await this.getAllComments();
            const timestamp = new Date().toLocaleString();

            let output = '';

            switch (format) {
                case 'plain':
                    output = `YouTube Comments - ${data.videoTitle}\n`;
                    output += `Exported: ${timestamp}\n`;
                    output += `Total Comments: ${data.totalCount}\n`;
                    output += `${'='.repeat(50)}\n\n`;

                    data.comments.forEach((comment, index) => {
                        const indent = '  '.repeat(comment.level);
                        output += `${indent}${index + 1}. ${comment.author}${comment.time ? ` (${comment.time})` : ''}:\n`;
                        output += `${indent}   ${comment.content}\n\n`;
                    });
                    break;

                case 'structured':
                    output = `# YouTube Comments - ${data.videoTitle}\n\n`;
                    output += `**Exported:** ${timestamp}  \n`;
                    output += `**Total Comments:** ${data.totalCount}\n\n`;
                    output += `---\n\n`;

                    data.comments.forEach((comment, index) => {
                        if (comment.level === 0) {
                            output += `## Comment ${index + 1}\n`;
                            output += `**Author:** ${comment.author}  \n`;
                            if (comment.time) output += `**Time:** ${comment.time}  \n`;
                            output += `**Content:**\n${comment.content}\n\n`;
                        } else {
                            output += `### Reply to Comment\n`;
                            output += `**Author:** ${comment.author}  \n`;
                            if (comment.time) output += `**Time:** ${comment.time}  \n`;
                            output += `**Content:**\n${comment.content}\n\n`;
                        }
                    });
                    break;

                case 'clean':
                    data.comments.forEach((comment) => {
                        if (comment.content.trim()) {
                            output += `${comment.content}\n\n`;
                        }
                    });
                    break;

                case 'json':
                    output = JSON.stringify({
                        videoTitle: data.videoTitle,
                        exportedAt: timestamp,
                        totalComments: data.totalCount,
                        comments: data.comments
                    }, null, 2);
                    break;
            }

            return output;
        }

        createCopyButton() {
            const button = document.createElement('button');
            button.className = CONFIG.COPY_BUTTON_CLASS;
            button.textContent = `${copyIcon} Copy`;
            button.title = 'Copy comment to clipboard';
            return button;
        }

        createCopyAllButton() {
            if (this.copyAllButtonAdded) return;

            // Check if we're on a video page
            if (!location.pathname.startsWith('/watch')) return;

            // Check if button already exists in DOM
            if (document.querySelector(`.${CONFIG.COPY_ALL_CONTAINER_CLASS}`)) {
                this.copyAllButtonAdded = true;
                return;
            }

            const container = document.createElement('div');
            container.className = CONFIG.COPY_ALL_CONTAINER_CLASS;

            // Add minimize/maximize button
            const toggleButton = document.createElement('button');
            toggleButton.textContent = '−';
            toggleButton.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: none;
                background: #666;
                color: white;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                transition: all 0.2s;
            `;

            let isMinimized = false;
            toggleButton.addEventListener('click', () => {
                isMinimized = !isMinimized;
                if (isMinimized) {
                    container.style.transform = 'translateY(calc(100% - 40px))';
                    toggleButton.textContent = '+';
                    toggleButton.style.background = '#4caf50';
                } else {
                    container.style.transform = 'translateY(0)';
                    toggleButton.textContent = '−';
                    toggleButton.style.background = '#666';
                }
            });

            container.appendChild(toggleButton);

            const infoDiv = document.createElement('div');
            infoDiv.className = 'copy-all-info';

            const updateInfo = () => {
                const commentCount = document.querySelectorAll(SELECTORS.COMMENT_THREAD).length;
                infoDiv.textContent = `${listIcon} ${commentCount} comments available`;

                // Hide container if no comments are available
                if (commentCount === 0) {
                    container.style.display = 'none';
                } else {
                    container.style.display = 'flex';
                }
            };
            updateInfo();

            const dropdown = document.createElement('div');
            dropdown.className = 'copy-all-dropdown';

            const mainButton = document.createElement('button');
            mainButton.className = CONFIG.COPY_ALL_BUTTON_CLASS;
            mainButton.textContent = `${copyIcon} Copy & Download All Comments`;

            mainButton.addEventListener('click', async (e) => {
                e.stopPropagation();

                let copySuccess = false;
                let downloadSuccess = false;

                try {
                    // Copy to clipboard
                    mainButton.textContent = `${copyIcon} Copying...`;
                    mainButton.classList.add('loading');
                    const content = await this.formatAllComments('plain');
                    copySuccess = await this.copyToClipboard(content);

                    // Download file
                    mainButton.textContent = `${downloadIcon} Downloading...`;
                    const videoTitle = document.title.replace(' - YouTube', '').replace(/[^\w\s-]/g, '');
                    const filename = `YouTube-Comments-${videoTitle}-${new Date().toISOString().split('T')[0]}.txt`;
                    downloadSuccess = await this.downloadAsFile(content, filename);

                } catch (error) {
                    this.log('Error in copy/download operation:', error);
                    mainButton.textContent = `${copyIcon} Error - Try Again`;
                    setTimeout(() => {
                        mainButton.textContent = `${copyIcon} Copy & Download All Comments`;
                    }, 3000);
                    mainButton.classList.remove('loading');
                    return;
                }

                // Show feedback
                if (copySuccess && downloadSuccess) {
                    mainButton.textContent = `${checkIcon} Copied & Downloaded!`;
                    mainButton.classList.add('copied');
                    setTimeout(() => {
                        mainButton.textContent = `${copyIcon} Copy & Download All Comments`;
                        mainButton.classList.remove('copied');
                    }, 3000);
                } else if (copySuccess) {
                    mainButton.textContent = `${checkIcon} Copied! (Download failed)`;
                    mainButton.classList.add('copied');
                    setTimeout(() => {
                        mainButton.textContent = `${copyIcon} Copy & Download All Comments`;
                        mainButton.classList.remove('copied');
                    }, 3000);
                } else if (downloadSuccess) {
                    mainButton.textContent = `${checkIcon} Downloaded! (Copy failed)`;
                    mainButton.classList.add('copied');
                    setTimeout(() => {
                        mainButton.textContent = `${copyIcon} Copy & Download All Comments`;
                        mainButton.classList.remove('copied');
                    }, 3000);
                } else {
                    mainButton.textContent = `${copyIcon} Error - Try Again`;
                    setTimeout(() => {
                        mainButton.textContent = `${copyIcon} Copy & Download All Comments`;
                    }, 3000);
                }

                mainButton.classList.remove('loading');
            });

            dropdown.appendChild(mainButton);

            container.appendChild(infoDiv);
            container.appendChild(dropdown);

            // Insert at the end of body to make it fixed positioned
            try {
                document.body.appendChild(container);
                this.copyAllButtonAdded = true;
                this.log('Copy all button created successfully');
            } catch (e) {
                this.log('Error creating copy all button:', e);
            }

            // Update comment count periodically
            setInterval(updateInfo, 5000);
        }

        showButtonFeedback(button, success, originalIcon = copyIcon) {
            button.classList.remove('loading');
            const isDownloadAction = button.textContent.includes('Download');

            if (success) {
                button.textContent = `${checkIcon} ${isDownloadAction ? 'Downloaded!' : 'Copied!'}`;
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = `${originalIcon} ${isDownloadAction ? 'Download as Text File' : 'Copy & Download All Comments'}`;
                    button.classList.remove('copied');
                }, 3000);
            } else {
                button.textContent = `${originalIcon} Error - Try Again`;
                setTimeout(() => {
                    button.textContent = `${originalIcon} ${isDownloadAction ? 'Download as Text File' : 'Copy & Download All Comments'}`;
                }, 3000);
            }
        }

        addCopyButtonToComment(commentElement) {
            const commentId = this.getCommentElementId(commentElement);
            if (this.copyButtonsAdded.has(commentId)) return;

            // Find the toolbar area where we can add the copy button
            const toolbar = commentElement.querySelector('#toolbar, ytd-menu-renderer, #action-buttons');
            if (!toolbar) return;

            const copyButton = this.createCopyButton();

            copyButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();

                const commentData = this.getCommentText(commentElement);
                const success = await this.copyToClipboard(commentData.formatted);

                if (success) {
                    copyButton.textContent = `${checkIcon} Copied!`;
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.textContent = `${copyIcon} Copy`;
                        copyButton.classList.remove('copied');
                    }, 2000);
                } else {
                    copyButton.textContent = 'Error';
                    setTimeout(() => {
                        copyButton.textContent = `${copyIcon} Copy`;
                    }, 2000);
                }
            });

            // Add context menu for additional copy options
            copyButton.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const commentData = this.getCommentText(commentElement);

                // Create context menu
                const menu = document.createElement('div');
                menu.style.cssText = `
                    position: absolute;
                    z-index: 10000;
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    padding: 4px 0;
                    min-width: 150px;
                `;

                const isDark = document.documentElement.hasAttribute('dark');
                if (isDark) {
                    menu.style.background = '#2a2a2a';
                    menu.style.borderColor = '#555';
                    menu.style.color = '#fff';
                }

                const menuOptions = [
                    { label: 'Copy full comment', text: commentData.formatted },
                    { label: 'Copy content only', text: commentData.content },
                    { label: 'Copy author only', text: commentData.author }
                ];

                menuOptions.forEach(option => {
                    const item = document.createElement('div');
                    item.textContent = option.label;
                    item.style.cssText = `
                        padding: 8px 12px;
                        cursor: pointer;
                        font-size: 13px;
                    `;

                    item.addEventListener('mouseenter', () => {
                        item.style.backgroundColor = isDark ? '#3a3a3a' : '#f0f0f0';
                    });

                    item.addEventListener('mouseleave', () => {
                        item.style.backgroundColor = 'transparent';
                    });

                    item.addEventListener('click', async () => {
                        await this.copyToClipboard(option.text);
                        document.body.removeChild(menu);
                        copyButton.textContent = `${checkIcon} Copied!`;
                        copyButton.classList.add('copied');
                        setTimeout(() => {
                            copyButton.textContent = `${copyIcon} Copy`;
                            copyButton.classList.remove('copied');
                        }, 1500);
                    });

                    menu.appendChild(item);
                });

                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';

                document.body.appendChild(menu);

                const removeMenu = () => {
                    if (document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                };

                setTimeout(() => {
                    document.addEventListener('click', removeMenu, { once: true });
                }, 100);
            });

            toolbar.appendChild(copyButton);
            this.copyButtonsAdded.add(commentId);
        }

        getCommentElementId(commentElement) {
            const author = commentElement.querySelector(SELECTORS.COMMENT_AUTHOR)?.textContent?.trim() || '';
            const content = commentElement.querySelector(SELECTORS.COMMENT_CONTENT)?.textContent?.trim() || '';
            return `${author}-${content.substring(0, 50)}`.replace(/[^a-zA-Z0-9]/g, '');
        }

        addCopyButtonsToVisibleComments() {
            const comments = document.querySelectorAll(`${SELECTORS.COMMENT_THREAD} #main`);
            comments.forEach(comment => {
                this.addCopyButtonToComment(comment);
            });

            // Also add to reply comments
            const replies = document.querySelectorAll(`${SELECTORS.COMMENT_THREAD} ytd-comment-renderer`);
            replies.forEach(reply => {
                this.addCopyButtonToComment(reply);
            });

            // Add copy all button
            this.createCopyAllButton();
        }

        isNotificationOpen() {
            const notificationBtn = document.querySelector('ytd-notification-topbar-button-renderer button[aria-expanded="true"]');
            return !!notificationBtn;
        }

        isAutoClickPaused() {
            return this.autoClickPaused;
        }

        getCommentId(thread) {
            const timestamp = thread.querySelector('#header-author time')?.getAttribute('datetime') || '';
            const id = thread.getAttribute('data-thread-id') || '';
            return `${id}-${timestamp}`;
        }

        isCommentExpanded(thread) {
            return this.expandedComments.has(this.getCommentId(thread));
        }

        markAsExpanded(thread) {
            thread.classList.add(CONFIG.EXPANDED_CLASS);
            this.expandedComments.add(this.getCommentId(thread));
        }

        async clickElements(selector) {
            if (this.isAutoClickPaused()) {
                this.log('Auto-click paused, skipping:', selector);
                return;
            }

            const elements = Array.from(document.querySelectorAll(selector));
            for (const el of elements) {
                const thread = el.closest(SELECTORS.COMMENT_THREAD);
                if (thread && this.isCommentExpanded(thread)) continue;

                const inComment = thread || el.closest(SELECTORS.COMMENTS);
                if (!inComment) continue;

                el.scrollIntoView({ behavior: 'auto', block: 'center' });
               await new Promise(r => setTimeout(r, 100));

               if (el.disabled || el.getAttribute('aria-expanded') === 'true') continue;

               try {
                   el.click();
                   if (thread) this.markAsExpanded(thread);
                   await new Promise(r => setTimeout(r, CONFIG.CLICK_INTERVAL));
               } catch (e) {
                   this.log('Click error:', e);
               }
           }
       }

       async processVisibleElements() {
           if (this.isAutoClickPaused()) {
               this.log('Auto-click paused, skipping processVisibleElements');
               return;
           }

           await this.clickElements(SELECTORS.MORE_COMMENTS);
           await this.clickElements(SELECTORS.SHOW_REPLIES);
           await this.clickElements(SELECTORS.HIDDEN_REPLIES);
           await this.clickElements(SELECTORS.CONTINUATION_REPLIES);
           await this.clickElements(SELECTORS.READ_MORE);

           // Add copy buttons after expanding comments
           setTimeout(() => this.addCopyButtonsToVisibleComments(), 1000);
       }

       setupGlobalClickPause() {
           document.addEventListener('click', (e) => {
               const sortMenu = e.target.closest('tp-yt-paper-menu-button');
               if (sortMenu) {
                   this.autoClickPaused = true;
                   this.log('Auto-click PAUSED due to click on sort menu');

                   clearTimeout(this.resumeTimer);
                   this.resumeTimer = setTimeout(() => {
                       this.autoClickPaused = false;
                       this.log('Auto-click RESUMED after sort menu interaction');
                   }, 2000);
               }
           }, true);
       }

       setupMutationObserver() {
           const container = document.querySelector(SELECTORS.COMMENTS);
           if (!container) return false;

           this.observer = new MutationObserver(() => {
               if (this.isAutoClickPaused()) {
                   this.log('Auto-click paused, skipping mutation-triggered expansion');
                   return;
               }
               this.processVisibleElements();
           });

           this.observer.observe(container, { childList: true, subtree: true });
           return true;
       }

       setupReadMoreIntersectionObserver() {
           const observer = new IntersectionObserver(entries => {
               for (const entry of entries) {
                   if (entry.isIntersecting) {
                       const el = entry.target;
                       if (!el || el.getAttribute('aria-expanded') === 'true') continue;
                       try {
                           el.click();
                           setTimeout(() => {
                               const less = el.parentElement?.parentElement?.querySelector('tp-yt-paper-button#less');
                               if (less) less.style.display = 'none';
                           }, 500);
                       } catch (e) {
                           this.log('ReadMore IO click error', e);
                       }
                   }
               }
           });

           const observeAllReadMores = () => {
               const buttons = document.querySelectorAll(SELECTORS.READ_MORE);
               buttons.forEach(btn => observer.observe(btn));
           };

           observeAllReadMores();

           const container = document.querySelector(SELECTORS.COMMENTS);
           if (container) {
               new MutationObserver(observeAllReadMores).observe(container, { childList: true, subtree: true });
           }
       }

       setupIntersectionObserver() {
           this.io = new IntersectionObserver(entries => {
               if (this.isNotificationOpen() || this.isAutoClickPaused()) return;

               for (const entry of entries) {
                   const inComment = entry.target.closest(SELECTORS.COMMENT_THREAD) || entry.target.closest(SELECTORS.COMMENTS);
                   if (entry.isIntersecting && inComment) {
                       try {
                           entry.target.click();
                       } catch (e) {
                           this.log('IO click error', e);
                       }
                   }
               }
           });

           const register = () => {
               const buttons = document.querySelectorAll(
                   `${SELECTORS.MORE_COMMENTS},${SELECTORS.SHOW_REPLIES},${SELECTORS.HIDDEN_REPLIES},${SELECTORS.CONTINUATION_REPLIES}`
               );
               this.ioTargets = Array.from(buttons).filter(btn =>
                   btn.closest(SELECTORS.COMMENT_THREAD) || btn.closest(SELECTORS.COMMENTS)
               );
               this.ioTargets.forEach(btn => this.io.observe(btn));
           };

           register();

           const container = document.querySelector(SELECTORS.COMMENTS);
           if (container) {
               new MutationObserver(register).observe(container, { childList: true, subtree: true });
           }

           this.ioControlInterval = setInterval(() => {
               if (this.isNotificationOpen() || this.isAutoClickPaused()) {
                   this.io.disconnect();
               } else {
                   this.ioTargets.forEach(el => {
                       try {
                           this.io.observe(el);
                       } catch {}
                   });
               }
           }, 500);
       }

       async init() {
           if (!location.pathname.startsWith('/watch')) return;

           // Add styles for copy buttons
           addStyles();

           for (let i = 0; i < 10 && !document.querySelector(SELECTORS.COMMENTS); i++) {
               await new Promise(r => setTimeout(r, CONFIG.INITIAL_DELAY));
           }

           if (!document.querySelector(SELECTORS.COMMENTS)) return;

           this.setupGlobalClickPause();
           this.setupMutationObserver();
           this.setupReadMoreIntersectionObserver();
           this.setupIntersectionObserver();

           setTimeout(() => {
               if (!this.autoClickPaused) {
                   this.processVisibleElements();
                   this.log('Initial processVisibleElements() executed');
               } else {
                   this.log('Initial expansion skipped due to paused state');
               }
           }, 3000);
       }

               cleanup() {
            if (this.observer) this.observer.disconnect();
            if (this.io) this.io.disconnect();
            clearInterval(this.ioControlInterval);
            this.expandedComments.clear();
            this.copyButtonsAdded.clear();
            this.copyAllButtonAdded = false;

            // Remove copy all button from DOM
            const existingButton = document.querySelector(`.${CONFIG.COPY_ALL_CONTAINER_CLASS}`);
            if (existingButton) {
                existingButton.remove();
            }
        }
   }

   const expander = new YouTubeCommentExpander();
   if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', () => setTimeout(() => expander.init(), CONFIG.INITIAL_DELAY));
   } else {
       setTimeout(() => expander.init(), CONFIG.INITIAL_DELAY);
   }

   let lastUrl = location.href;
   new MutationObserver(() => {
       if (location.href !== lastUrl) {
           lastUrl = location.href;
           expander.cleanup();
           setTimeout(() => expander.init(), CONFIG.INITIAL_DELAY);
       }
   }).observe(document.body, { childList: true, subtree: true });
})();
