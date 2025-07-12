(async () => {
  // --- Configuration ---
  const threadTitleSelector = 'div.structItem-title a[data-tp-primary="on"]';
  const totalPagesSelector = '.pageNavSimple-el--current'; // Selector for the element showing "1 of X" pages

  // --- Get Base URL and Total Pages ---
  const currentPageUrl = window.location.href;
  const baseUrlMatch = currentPageUrl.match(/(.*)\/page-\d+/);
  const baseUrl = baseUrlMatch ? baseUrlMatch[1] : currentPageUrl.split('?')[0]; // Adjust to get the base URL without page number

  const totalPagesElement = document.querySelector(totalPagesSelector);
  let totalPages = 1;

  if (totalPagesElement) {
    const pageText = totalPagesElement.textContent.trim();
    const match = pageText.match(/of (\d+)/);
    if (match && match[1]) {
      totalPages = parseInt(match[1], 10);
      console.log(`Found ${totalPages} pages.`);
    } else {
      console.warn('Could not parse total pages. Assuming 1 page.');
    }
  } else {
    console.warn('Could not find total pages element. Assuming 1 page.');
  }

  const allThreadTitles = [];

  // --- Iterate through pages and fetch content ---
  for (let i = 1; i <= totalPages; i++) {
    const pageUrl = i === 1 ? baseUrl : `${baseUrl}/page-${i}`;
    console.log(`Fetching page ${i} of ${totalPages}: ${pageUrl}`);

    try {
      const response = await fetch(pageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${pageUrl}`);
      }
      const htmlText = await response.text();

      // Parse the HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Extract thread titles from the parsed document
      const titlesOnPage = doc.querySelectorAll(threadTitleSelector);
      titlesOnPage.forEach((titleElement) => {
        allThreadTitles.push(titleElement.textContent.trim());
      });

      // Optional: Add a small delay to avoid hitting rate limits
      // await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

    } catch (error) {
      console.error(`Error fetching or parsing page ${i}:`, error);
    }
  }

  // --- Print all collected thread titles ---
  if (allThreadTitles.length > 0) {
    console.log('\n--- All Thread Titles ---');
    allThreadTitles.forEach((title, index) => {
      console.log(`Thread ${index + 1}: ${title}`);
    });
    console.log(`\nTotal threads found: ${allThreadTitles.length}`);
  } else {
    console.log('No thread titles found across all pages. Please verify selectors and page structure.');
  }
})();
