// ==UserScript==
// @name         Google Play Reviews Parser 
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  
// @author       Developer
// @match        https://play.google.com/store/apps/details?*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const maxReviews = 100;
    const reviewsData = [];

    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/more_vert/g, '')
            .replace(/Позначити відгук як неприйнятний/g, '')
            .replace(/Показати історію відгуків/g, '')
            .replace(/Відповісти/g, '')
            .replace(/Переглянути відповідь/g, '')
            .replace(/Ви вважаєте цей відгук корисним\?.*?(ТакНі|Таки)/g, '')
            .replace(/\d+ користувач\w* вважа\w* цей відгук корисним/g, '')
            .replace(/(\s+)/g, ' ')
            .trim();
    }

    function parseReviews() {
        const reviews = [];
        const modal = document.querySelector('div[role="dialog"]');
        if (!modal) return reviews;

        // Ищем все контейнеры отзывов через поиск элементов которые содержат звёзды
        const allElements = modal.querySelectorAll('*');
        const starContainers = new Set();

        // Ищем SVG или элементы со звёздами
        allElements.forEach(el => {
            const style = el.getAttribute('style') || '';
            const innerHTML = el.innerHTML || '';
            const ariaLabel = el.getAttribute('aria-label') || '';

            // Проверяем есть ли звёзды
            if (innerHTML.includes('★') || ariaLabel.match(/\d\s*зв/) || innerHTML.includes('star')) {
                // Это либо сама звезда, либо родитель должен быть контейнером
                let container = el.closest('[role="article"]') ||
                               el.closest('[data-review-id]') ||
                               el.closest('div[style*="padding"]') ||
                               el;

                // Ищем вверх достаточно далеко
                if (!container || container === el) {
                    let current = el;
                    for (let i = 0; i < 8; i++) {
                        current = current.parentElement;
                        if (!current) break;
                        const text = current.textContent;
                        // Должен содержать автора, дату, и текст
                        if (text && text.match(/\d+\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)/)) {
                            container = current;
                            break;
                        }
                    }
                }

                if (container) {
                    starContainers.add(container);
                }
            }
        });

        console.log(`🔍 Найдено контейнеров со звёздами: ${starContainers.size}`);

        // Парсим каждый контейнер
        starContainers.forEach(container => {
            try {
                const containerText = container.textContent;

                // Извлекаем автора - первый текст в контейнере (обычно в <span>)
                const spans = container.querySelectorAll('span');
                let author = 'Unknown';

                for (let span of spans) {
                    const text = span.textContent.trim();
                    // Автор это короткий текст, не содержит звёзд и дат
                    if (text.length > 2 &&
                        text.length < 60 &&
                        !text.includes('★') &&
                        !text.match(/\d+\s*(січня|лютого|березня)/) &&
                        !text.includes('користувач')) {
                        author = text;
                        break;
                    }
                }

                // Извлекаем дату
                const dateMatch = containerText.match(/(\d+)\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)\s+(\d+)\s+р\./);
                const date = dateMatch ? dateMatch[0] : '';

                // КЛЮЧЕВОЙ ШАГ: Извлекаем текст отзыва
                // Текст находится между: датой и блоком "користувачи вважають"

                // Способ 1: Ищем узлы текста напрямую
                let reviewText = '';

                // Получаем весь HTML контейнера и парсим его
                const innerHTML = container.innerHTML;

                // Ищем текст который находится между датой и "користувач"
                const dateIndex = innerHTML.indexOf(date);
                if (dateIndex > -1) {
                    const afterDate = innerHTML.substring(dateIndex + date.length);
                    const endIndex = afterDate.search(/\d+\s+користувач/);

                    if (endIndex > -1) {
                        let textBlock = afterDate.substring(0, endIndex);
                        // Чистим HTML теги
                        textBlock = textBlock.replace(/<[^>]*>/g, ' ').trim();
                        reviewText = textBlock;
                    }
                }

                // Способ 2: Если способ 1 не сработал - ищем через childNodes
                if (!reviewText || reviewText.length < 20) {
                    let foundText = false;
                    let textNodes = [];

                    // Собираем все текстовые ноды
                    function collectTextNodes(node) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent.trim();
                            if (text.length > 20 &&
                                !text.includes('★') &&
                                !text.includes('користувач') &&
                                !text.includes('Ви вважаєте')) {
                                textNodes.push(text);
                            }
                        } else {
                            for (let child of node.childNodes) {
                                collectTextNodes(child);
                            }
                        }
                    }

                    collectTextNodes(container);

                    if (textNodes.length > 0) {
                        // Берём самый длинный текстовый нод
                        reviewText = textNodes.sort((a, b) => b.length - a.length)[0];
                    }
                }

                if (author !== 'Unknown' && reviewText && reviewText.length > 20) {
                    reviews.push({
                        author: cleanText(author),
                        date: date,
                        text: cleanText(reviewText)
                    });
                }

            } catch (e) {
                console.error('❌ Ошибка парсинга контейнера:', e);
            }
        });

        return reviews;
    }

    async function scrollAndCollect() {
    const modal = document.querySelector('div[role="dialog"]');
    if (!modal) return false;

    let noChangeCount = 0;
    let prevCount = 0;

    const MAX_NOCHANGE = 15; // было 3 — сильно увеличиваем
    const SCROLL_DELAY = 800;

    while (reviewsData.length < maxReviews) {
        // Находим самый большой по высоте скроллируемый контейнер
        const scrollable = [...modal.querySelectorAll('*')]
            .filter(el => el.scrollHeight > el.clientHeight)
            .sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || modal;

        // ⚡ Агрессивный скролл — несколько раз подряд
        for (let i = 0; i < 5; i++) {
            scrollable.scrollTop = scrollable.scrollHeight;
            await new Promise(res => setTimeout(res, SCROLL_DELAY));
        }

        // Парсим отзывы
        const newReviews = parseReviews();

        // Добавляем уникальные
        newReviews.forEach(r => {
            if (!reviewsData.find(x => x.text === r.text && x.author === r.author)) {
                reviewsData.push(r);
            }
        });

        console.log(`📊 Собрано отзывов: ${reviewsData.length}/${maxReviews}`);

        // Проверяем прогресс
        if (reviewsData.length === prevCount) {
            noChangeCount++;
        } else {
            noChangeCount = 0;
        }

        prevCount = reviewsData.length;

        // Если много попыток без новых данных — реально конец списка
        if (noChangeCount >= MAX_NOCHANGE) {
            console.log("⛔ Google больше не подгружает отзывы.");
            break;
        }
    }

    return true;
}

    function downloadReviews() {
        if (reviewsData.length === 0) {
            alert('❌ Отзывы не найдены!');
            return;
        }

        const appName = document.querySelector('h1')?.textContent.trim() || 'App';
        const now = new Date().toLocaleString('uk-UA');

        let content = '═'.repeat(75) + '\n';
        content += `📱 ПРИЛОЖЕНИЕ: ${appName}\n`;
        content += `📊 ВСЬОГО ОТЗЫВОВ: ${reviewsData.length}\n`;
        content += `📅 ДАТА СБОРА: ${now}\n`;
        content += '═'.repeat(75) + '\n\n';

        reviewsData.forEach((review, i) => {
            content += `\n${'─'.repeat(75)}\n`;
            content += `[ОТЗЫВ #${i + 1}]\n`;
            content += `Автор: ${review.author}\n`;
            content += `Дата: ${review.date}\n`;
            content += `${'─'.repeat(75)}\n`;
            content += `${review.text}\n`;
        });

        content += '\n' + '═'.repeat(75) + '\n';
        content += `✅ Конец документа (${reviewsData.length} отзывов)\n`;

        const blob = new Blob([content], {type: 'text/plain; charset=utf-8'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Reviews_${appName}_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`✅ Завантажено ${reviewsData.length} відгуків!`);
    }

    // Main
    (async function main() {
        if (!window.location.pathname.includes('/details')) return;

        console.log('⏳ Загрузка страницы...');
        await new Promise(r => setTimeout(r, 3000));

        const btn = Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent.includes('Переглянути')
        );

        if (!btn) {
            alert('❌ Кнопка не найдена');
            return;
        }

        console.log('✅ Кнопка найдена, открываю модалку...');
        btn.click();

        await new Promise(r => setTimeout(r, 2000));

        console.log('🔄 Начинаю сбор отзывов...');
        await scrollAndCollect();

        console.log(`✅ Всего собрано ${reviewsData.length} отзывов`);
        downloadReviews();
    })();
})();
