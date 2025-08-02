// ==UserScript==
// @name         Reddit Comment Expander
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Expands all collapsed comments on Reddit and provides a download button for expanded comments.
// @author       You
// @match        https://www.reddit.com/r/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- User Adjustable Settings ---
    const INITIAL_EXPANSION_DELAY_MS = 1000; // Delay before the first attempt to expand comments
    const SCROLL_AMOUNT_PX = 200; // Amount to scroll down to trigger lazy loading
    const RAPID_POLLING_INTERVAL_MS = 100; // How frequently to check for new expand buttons during active expansion
    const MUTATION_OBSERVER_DEBOUNCE_MS = 250; // Delay for MutationObserver to debounce DOM changes
    const MAX_CONSECUTIVE_NO_BUTTONS = 5; // How many consecutive passes with no new buttons before stopping rapid polling
    const DOWNLOAD_BUTTON_ID = 'reddit-download-comments-btn';
    const DOWNLOAD_BUTTON_TEXT = 'Download Comments';
    // --------------------------------

    // Function to click all "expando" buttons and "load more replies" buttons
    function findAndClickExpandButtons() {
        let clickedCount = 0;

        // Select expand/collapse buttons based on aria-label.
        const expandCollapseSelectors = 'button[aria-label="expand comment"], div[aria-label="expand comment"], button[aria-label="Toggle Comment Thread"]';
        const expandCollapseButtons = Array.from(document.querySelectorAll(expandCollapseSelectors)).filter(button => {
            const ariaLabel = button.getAttribute('aria-label');
            // Do not click buttons that are for collapsing comments
            if (ariaLabel && ariaLabel.toLowerCase().includes('collapse')) {
                return false;
            }
            // Exclude elements that are clearly expanded threads (to avoid re-clicking and collapsing).
            if (ariaLabel && ariaLabel.toLowerCase().includes('toggle comment thread') && button.hasAttribute('expanded')) {
                return false;
            }
            return button.offsetParent !== null; // Only consider visible elements
        });

        // Select "load more replies" buttons/spans/links based on text content.
        // These often appear as "Еще X ответов" (More X replies).
        const moreRepliesElements = Array.from(document.querySelectorAll('button, span, a')).filter(element => {
            const text = element.innerText.trim(); // Changed to innerText for better compatibility with <faceplate-number>
            // Use a regular expression to robustly check for "Еще [number] ответов"
            return /^Еще \d+ ответа(s)?$/.test(text) && element.offsetParent !== null;
        });

        // Combine all found buttons/elements into a single list for processing.
        const allElementsToClick = [...expandCollapseButtons, ...moreRepliesElements];

        allElementsToClick.forEach(element => {
            // Attempt to click the element using a more robust event dispatching method
            try {
                element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                console.log('Dispatched click event to:', element);
            } catch (e) {
                // Fallback to direct click if event dispatch fails
                element.click();
                console.log('Fallback direct click on:', element);
            }
            clickedCount++;
        });

        return clickedCount; // Return the number of elements clicked in this pass
    }

    // Recursive function to keep expanding comments until no more expand buttons are found.
    // This handles cases where clicking one button reveals more collapsible content.
    function recursiveExpandComments() {
        // Scroll down slightly to trigger lazy loading of comments
        window.scrollBy(0, SCROLL_AMOUNT_PX); 

        let consecutiveNoButtonsFound = 0;

        function rapidPoll() {
            const clickedThisAttempt = findAndClickExpandButtons();

            if (clickedThisAttempt > 0) {
                console.log(`Clicked ${clickedThisAttempt} buttons this rapid pass. Continuing rapid scan...`);
                consecutiveNoButtonsFound = 0; // Reset counter if new buttons were found and clicked
            } else {
                consecutiveNoButtonsFound++;
                console.log(`No buttons clicked this rapid pass. Consecutive no-finds: ${consecutiveNoButtonsFound}`);
            }

            if (consecutiveNoButtonsFound < MAX_CONSECUTIVE_NO_BUTTONS) {
                // If we're still finding buttons or haven't hit the "no-buttons" limit, continue rapid polling
                setTimeout(rapidPoll, RAPID_POLLING_INTERVAL_MS);
            } else {
                console.log(`Rapid polling complete: ${MAX_CONSECUTIVE_NO_BUTTONS} consecutive passes with no new buttons.`);
                // At this point, the DOM *should* be relatively stable.
                // The MutationObserver will pick up future changes.
            }
        }

        // Start the rapid polling
        rapidPoll();
    }

    let observerDebounceTimeout;

    // Initial run of the expansion logic after the page has loaded.
    // A delay is used to ensure the initial comments are rendered before the script starts.
    setTimeout(() => {
        console.log('Initial expansion attempt after page load...');
        recursiveExpandComments();
    }, INITIAL_EXPANSION_DELAY_MS); 

    // Use a MutationObserver to continuously monitor the DOM for changes.
    // This is crucial for expanding comments that load dynamically (e.g., infinite scroll, or after user interaction).
    const observer = new MutationObserver(() => {
        // Clear any existing debounce timeout to prevent multiple rapid calls.
        clearTimeout(observerDebounceTimeout);

        // Set a new timeout to run the expansion function after a short delay.
        // This debounces the calls, ensuring it only runs after DOM mutations have settled.
        observerDebounceTimeout = setTimeout(() => {
            console.log('DOM changes detected and settled. Re-scanning for new expand/load more buttons...');
            recursiveExpandComments();
        }, MUTATION_OBSERVER_DEBOUNCE_MS); 
    });

    // Observe the entire document body for any child additions or subtree modifications.
    observer.observe(document.body, { childList: true, subtree: true });

    // Add the download button to the page
    function addDownloadButton() {
        const button = document.createElement('button');
        button.id = DOWNLOAD_BUTTON_ID;
        button.textContent = DOWNLOAD_BUTTON_TEXT;
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #0079d3; /* Reddit blue */
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 15px;
            cursor: pointer;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            display: flex; /* Use flexbox for centering */
            align-items: center; /* Center vertically */
            justify-content: center; /* Center horizontally */
            min-width: 150px; /* Ensure enough width for text */
            height: 40px; /* Fixed height for consistent look */
        `;
        document.body.appendChild(button);

        button.addEventListener('click', downloadComments);
    }

    // Function to collect and download comments
    function downloadComments() {
        let allCommentsText = '';

        // Collect all shreddit-comment elements on the page.
        const allShredditComments = Array.from(document.querySelectorAll('shreddit-comment'));

        // Map to quickly access comment elements by their thingid
        const commentMap = new Map();
        // Map to store children for each parent
        const childrenMap = new Map();

        allShredditComments.forEach(commentElement => {
            const thingId = commentElement.getAttribute('thingid');
            const parentId = commentElement.getAttribute('parentid');

            if (thingId) {
                commentMap.set(thingId, commentElement);
            }

            if (parentId) {
                if (!childrenMap.has(parentId)) {
                    childrenMap.set(parentId, []);
                }
                childrenMap.get(parentId).push(commentElement);
            }
        });

        // Identify top-level comments (those with no parent or whose parent is not in our collected set)
        const rootCommentElements = allShredditComments.filter(commentElement => {
            const parentId = commentElement.getAttribute('parentid');
            // A comment is a root if it has no parentId, or if its parentId is not among the collected comments' thingIds
            // This handles cases where the immediate parent might be an unloaded comment or part of another structure.
            return !parentId || (!commentMap.has(parentId) && parentId.startsWith('t3_')); // t3_ indicates a post, not a comment
        });

        // Sort root comments by their appearance in the DOM
        rootCommentElements.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

        let currentRootNumber = 1;

        rootCommentElements.forEach(rootComment => {
            allCommentsText += formatCommentRecursive(rootComment, 1, `${currentRootNumber}`, childrenMap);
            currentRootNumber++;
        });

        // Helper function to recursively format comments and their children
        function formatCommentRecursive(commentElement, level, numberingPrefix, childrenMap) {
            let commentOutput = '';

            const author = commentElement.getAttribute('author') || 'Unknown Author';
            const commentBody = commentElement.querySelector('div[id$="-comment-rtjson-content"]');
            
            if (commentBody) {
                const content = commentBody.textContent.trim();
                const indent = '    '.repeat(level - 1); // No indent for level 1

                commentOutput += `${indent}${numberingPrefix}) Comment by ${author}: ${content}\n`;
            }

            // Get children of the current comment
            const children = childrenMap.get(commentElement.getAttribute('thingid')) || [];
            // Sort children by their appearance in the DOM to maintain logical flow
            children.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

            let currentChildNumber = 1;
            children.forEach(childComment => {
                commentOutput += formatCommentRecursive(childComment, level + 1, `${numberingPrefix}.${currentChildNumber}`, childrenMap);
                currentChildNumber++;
            });

            return commentOutput;
        }

        // Create a Blob and initiate download
        const blob = new Blob([allCommentsText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate a timestamp for the filename
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                          (now.getMonth() + 1).toString().padStart(2, '0') +
                          now.getDate().toString().padStart(2, '0') + '_' +
                          now.getHours().toString().padStart(2, '0') +
                          now.getMinutes().toString().padStart(2, '0') +
                          now.getSeconds().toString().padStart(2, '0');
        a.download = `reddit_comments_${timestamp}.txt`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Add the button when the page loads
    window.addEventListener('load', addDownloadButton);

})(); 
