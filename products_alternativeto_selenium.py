"""
AlternativeTo scraper with Selenium and SOLID principles.

Responsibilities:
- Fetch product data from AlternativeTo.net using Selenium
- Parse HTML to extract product information
- Handle JavaScript-based pagination
- Save results to file
"""

from __future__ import annotations

import csv
import logging
import re
import time
from abc import abstractmethod
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Protocol, Iterable

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup, Tag


# ============================================================================
# Configuration & Domain Models (SRP: Data structures)
# ============================================================================


@dataclass(frozen=True)
class ScraperConfig:
    """Configuration for scraper behavior."""

    base_url: str
    max_pages: int
    page_load_timeout: int = 20
    element_wait_timeout: int = 10
    delay_between_pages: float = 2.0
    headless: bool = True

    def get_page_url(self, page: int) -> str:
        """Generate URL for specific page."""
        if page == 1:
            return self.base_url
        return f"{self.base_url}&page={page}"


@dataclass(frozen=True)
class Product:
    """Domain model for a product."""

    name: str
    url: str
    description: str
    likes: str

    def to_formatted_string(self) -> str:
        """Convert product to formatted output string."""
        return (
            f"Название: {self.name}\n"
            f"Ссылка: {self.url}\n"
            f"Описание: {self.description}\n"
            f"Лайков: {self.likes}\n"
        )

    def get_likes_count(self) -> int:
        """Extract numeric likes count from likes string."""
        match = re.search(r"(\d+)", self.likes)
        return int(match.group(1)) if match else 0


# ============================================================================
# Protocols (DIP: Depend on abstractions)
# ============================================================================


class BrowserDriver(Protocol):
    """Protocol for browser automation drivers."""

    def navigate_to_page(self, page_number: int) -> str:
        """Navigate to page and return HTML content."""
        ...

    def close(self) -> None:
        """Close the browser."""
        ...


class HtmlParser(Protocol):
    """Protocol for HTML parsers."""

    def parse_products(self, html: str) -> list[Product]:
        """Parse products from HTML content."""
        ...


class Storage(Protocol):
    """Protocol for storage implementations."""

    def save(self, products: Iterable[Product]) -> None:
        """Save products to storage."""
        ...


# ============================================================================
# Browser Driver (SRP: Handle browser automation)
# ============================================================================


class SeleniumBrowserDriver:
    """Browser driver implementation using Selenium."""

    def __init__(self, config: ScraperConfig):
        self._config = config
        self._driver = None
        self._logger = logging.getLogger(__name__)
        self._initialize_driver()

    def _initialize_driver(self) -> None:
        """Initialize Chrome WebDriver with undetected-chromedriver to bypass Cloudflare."""
        options = uc.ChromeOptions()

        # Headless mode with undetected-chromedriver (may still be detected by some sites)
        if self._config.headless:
            options.add_argument("--headless=new")

        # Basic options for performance
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        # Disable images for faster loading
        prefs = {
            "profile.default_content_setting_values": {
                "images": 2,
            }
        }
        options.add_experimental_option("prefs", prefs)

        try:
            # Use undetected-chromedriver instead of regular Selenium
            # This automatically bypasses most anti-bot protections including Cloudflare
            self._driver = uc.Chrome(options=options, use_subprocess=False)
            self._driver.set_page_load_timeout(self._config.page_load_timeout)

            self._logger.info("Undetected Chrome WebDriver initialized successfully")
        except Exception as e:
            self._logger.error(f"Failed to initialize WebDriver: {e}")
            raise

    def navigate_to_page(self, page_number: int) -> str:
        """Navigate to page and return HTML content."""
        if page_number == 1:
            url = self._config.base_url
            self._driver.get(url)
            self._logger.info(f"Navigated to first page: {url}")
            self._wait_for_products()
        else:
            # For pages 2+, scroll to load more or click next
            time.sleep(self._config.delay_between_pages)
            self._navigate_to_next_page(page_number)

        return self._driver.page_source

    def get_all_products_with_scrolling(self, max_scrolls: int) -> str:
        """Load all products by scrolling and return final HTML."""
        url = self._config.base_url
        self._driver.get(url)
        self._logger.info(f"Loading page with infinite scroll: {url}")
        self._wait_for_products()

        scroll_count = 0
        no_change_count = 0

        while scroll_count < max_scrolls:
            previous_count = len(self._driver.find_elements(By.TAG_NAME, "article"))

            # Scroll to bottom
            self._driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight);"
            )
            time.sleep(self._config.delay_between_pages)

            # Wait for potential new content
            try:
                time.sleep(0.01)
            except:
                pass

            current_count = len(self._driver.find_elements(By.TAG_NAME, "article"))

            if current_count > previous_count:
                self._logger.info(
                    f"Scroll {scroll_count + 1}: Loaded {current_count - previous_count} "
                    f"new products (total: {current_count})"
                )
                no_change_count = 0
            else:
                no_change_count += 1
                self._logger.debug(f"Scroll {scroll_count + 1}: No new products loaded")

                # If no new products after 3 scrolls, we've reached the end
                if no_change_count >= 3:
                    self._logger.info(
                        f"No new products after {no_change_count} scrolls. Stopping."
                    )
                    break

            scroll_count += 1

        final_count = len(self._driver.find_elements(By.TAG_NAME, "article"))
        self._logger.info(f"Finished scrolling. Total products visible: {final_count}")

        return self._driver.page_source

    def _wait_for_products(self, expect_stale: bool = False) -> None:
        """Wait for product cards to appear on page."""
        try:
            if expect_stale:
                # Wait a bit for old content to start updating
                time.sleep(0.01)

            wait = WebDriverWait(self._driver, self._config.element_wait_timeout)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "article")))
            # Additional wait for content to stabilize
            time.sleep(0.1)
            self._logger.debug("Products loaded successfully")
        except TimeoutException:
            self._logger.warning("Timeout waiting for products to load")

    def _wait_for_page_change(self, old_url: str, timeout: int = 10) -> bool:
        """Wait for URL to change after clicking pagination."""
        try:
            wait = WebDriverWait(self._driver, timeout)
            wait.until(lambda driver: driver.current_url != old_url)
            self._logger.debug(
                f"Page changed from {old_url} to {self._driver.current_url}"
            )
            return True
        except TimeoutException:
            self._logger.warning(f"Timeout waiting for page change from {old_url}")
            return False

    def _scroll_to_load_more(self) -> bool:
        """Scroll to bottom to trigger infinite scroll loading."""
        try:
            # Get initial product count
            initial_count = len(self._driver.find_elements(By.TAG_NAME, "article"))

            # Scroll to bottom
            self._driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight);"
            )
            time.sleep(0.1)

            # Check if more products loaded
            new_count = len(self._driver.find_elements(By.TAG_NAME, "article"))

            if new_count > initial_count:
                self._logger.info(
                    f"Loaded more products: {initial_count} -> {new_count}"
                )
                return True
            else:
                self._logger.debug("No new products loaded after scroll")
                return False

        except Exception as e:
            self._logger.error(f"Error during scroll: {e}")
            return False

    def _navigate_to_next_page(self, page_number: int) -> None:
        """Navigate to next page using pagination."""
        try:
            # Get current URL to detect change
            old_url = self._driver.current_url

            # Scroll to bottom where pagination is located
            self._driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight);"
            )
            time.sleep(0.1)

            # Try to find and click the next page button
            # AlternativeTo uses <span role="link"> for pagination
            selectors = [
                f"//span[@role='link' and text()='{page_number}']",
                f"//a[text()='{page_number}']",
                f"//button[text()='{page_number}']",
                "//span[@role='link' and contains(text(), '❯')]",  # Next arrow
                "//a[contains(@aria-label, 'Next')]",
            ]

            clicked = False
            for selector in selectors:
                try:
                    wait = WebDriverWait(self._driver, 5)
                    element = wait.until(
                        EC.element_to_be_clickable((By.XPATH, selector))
                    )

                    # Scroll element into view
                    self._driver.execute_script(
                        "arguments[0].scrollIntoView({block: 'center'});", element
                    )
                    time.sleep(0.1)

                    # Click using JavaScript to avoid interception
                    self._driver.execute_script("arguments[0].click();", element)

                    clicked = True
                    self._logger.info(
                        f"Clicked pagination element for page {page_number}"
                    )

                    # Scroll to top after click to trigger content load
                    self._driver.execute_script("window.scrollTo(0, 0);")
                    time.sleep(0.1)

                    # Wait for URL to change or content to update
                    url_changed = self._wait_for_page_change(old_url, timeout=5)
                    if not url_changed:
                        # If URL didn't change, wait a bit more for SPA to update
                        time.sleep(0.1)

                    break
                except (NoSuchElementException, TimeoutException) as e:
                    self._logger.debug(f"Selector {selector} not found: {e}")
                    continue

            if not clicked:
                self._logger.warning(
                    f"Could not navigate to page {page_number} - no pagination button found"
                )

            # Wait for new products to load (expect stale elements after click)
            self._wait_for_products(expect_stale=True)

        except Exception as e:
            self._logger.error(f"Failed to navigate to page {page_number}: {e}")
            raise

    def close(self) -> None:
        """Close the browser."""
        if self._driver:
            try:
                self._driver.quit()
                self._logger.info("Browser closed")
            except Exception as e:
                self._logger.debug(
                    f"Exception during browser cleanup (can be ignored): {e}"
                )
            finally:
                self._driver = None


# ============================================================================
# HTML Parser (SRP: Parse HTML content)
# ============================================================================


class ProductCardExtractor:
    """Extracts product data from HTML card element."""

    BASE_DOMAIN = "https://alternativeto.net"

    def extract_name_and_url(self, card: Tag) -> tuple[str, str]:
        """Extract product name and URL from card."""
        # Look for main product link
        for a_tag in card.find_all("a", href=True):
            text = a_tag.get_text(strip=True)
            href = a_tag.get("href", "")

            if text and "/software/" in href:
                url = href if href.startswith("http") else self.BASE_DOMAIN + href
                return text, url

        return "?", ""

    def extract_description(self, card: Tag) -> str:
        """Extract product description from card."""
        # Try multiple selectors for description
        p_tag = card.find(
            "p", class_=lambda x: x and "description" in x.lower() if x else False
        )
        if not p_tag:
            p_tag = card.find("p")

        return p_tag.get_text(strip=True) if p_tag else ""

    def extract_likes(self, card: Tag) -> str:
        """Extract likes count from card."""
        # Try finding span with 'like' class
        like_tag = card.find(
            lambda tag: tag.name == "span" and "like" in tag.get("class", [])
        )

        # Fallback to span with tooltip attributes
        if not like_tag:
            like_tag = card.find(
                lambda tag: tag.name == "span"
                and ("data-tooltip" in tag.attrs or "aria-label" in tag.attrs)
            )

        # Try button with likes
        if not like_tag:
            like_tag = card.find(
                "button", class_=lambda x: x and "like" in x.lower() if x else False
            )

        return like_tag.get_text(strip=True) if like_tag else "0"

    def extract(self, card: Tag) -> Product:
        """Extract complete product from card element."""
        name, url = self.extract_name_and_url(card)
        description = self.extract_description(card)
        likes = self.extract_likes(card)

        return Product(name=name, url=url, description=description, likes=likes)


class BeautifulSoupHtmlParser:
    """HTML parser implementation using BeautifulSoup."""

    def __init__(self, card_extractor: ProductCardExtractor | None = None):
        self._card_extractor = card_extractor or ProductCardExtractor()
        self._logger = logging.getLogger(__name__)

    def parse_products(self, html: str) -> list[Product]:
        """Parse all products from HTML page."""
        soup = BeautifulSoup(html, "html.parser")
        cards = soup.find_all("article")

        self._logger.debug(f"Found {len(cards)} article cards in HTML")

        products = []
        for card in cards:
            try:
                product = self._card_extractor.extract(card)
                # Skip empty products
                if product.name != "?" and product.url:
                    products.append(product)
            except Exception as e:
                self._logger.warning(f"Failed to parse product card: {e}")

        return products


# ============================================================================
# Storage (SRP: Handle data persistence)
# ============================================================================


class TextFileStorage:
    """Storage implementation that saves to text file."""

    def __init__(self, file_path: Path, encoding: str = "utf-8"):
        self._file_path = file_path
        self._encoding = encoding
        self._logger = logging.getLogger(__name__)

    def save(self, products: Iterable[Product]) -> None:
        """Save products to text file."""
        try:
            with open(self._file_path, "w", encoding=self._encoding) as f:
                for product in products:
                    f.write(product.to_formatted_string() + "\n")

            self._logger.info(f"Saved products to {self._file_path}")
        except IOError as e:
            self._logger.error(f"Failed to save to {self._file_path}: {e}")
            raise


class CsvStorage:
    """Storage implementation that saves to CSV file with sorting by likes."""

    def __init__(
        self, file_path: Path, encoding: str = "utf-8", sort_by_likes: bool = True
    ):
        self._file_path = file_path
        self._encoding = encoding
        self._sort_by_likes = sort_by_likes
        self._logger = logging.getLogger(__name__)

    def save(self, products: Iterable[Product]) -> None:
        """Save products to CSV file, optionally sorted by likes count."""
        try:
            products_list = list(products)

            # Sort by likes count (descending) if enabled
            if self._sort_by_likes:
                products_list.sort(key=lambda p: p.get_likes_count(), reverse=True)
                self._logger.info(
                    f"Sorted {len(products_list)} products by likes count"
                )

            # Write to CSV
            with open(self._file_path, "w", encoding=self._encoding, newline="") as f:
                fieldnames = ["name", "url", "description", "likes", "likes_count"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)

                writer.writeheader()
                for product in products_list:
                    row = asdict(product)
                    row["likes_count"] = product.get_likes_count()
                    writer.writerow(row)

            self._logger.info(
                f"Saved {len(products_list)} products to {self._file_path}"
            )
        except IOError as e:
            self._logger.error(f"Failed to save to {self._file_path}: {e}")
            raise


# ============================================================================
# Page Scraper (SRP: Coordinate scraping of single page)
# ============================================================================


class PageScraper:
    """Scrapes products from a single page."""

    def __init__(self, browser_driver: BrowserDriver, html_parser: HtmlParser):
        self._browser_driver = browser_driver
        self._html_parser = html_parser
        self._logger = logging.getLogger(__name__)

    def scrape(self, page_number: int) -> list[Product]:
        """Scrape products from a single page."""
        self._logger.info(f"Scraping page {page_number}")

        try:
            html = self._browser_driver.navigate_to_page(page_number)
            products = self._html_parser.parse_products(html)

            if products:
                first_product = products[0]
                self._logger.info(
                    f"Page {page_number}: Found {len(products)} products, "
                    f"first: {first_product.name}"
                )
            else:
                self._logger.warning(f"Page {page_number}: No products found")

            return products
        except Exception as e:
            self._logger.error(f"Failed to scrape page {page_number}: {e}")
            return []


# ============================================================================
# Multi-Page Scraper (SRP: Coordinate multi-page scraping)
# ============================================================================


class MultiPageScraper:
    """Scrapes products from multiple pages sequentially."""

    def __init__(
        self,
        page_scraper: PageScraper,
        browser_driver: BrowserDriver,
        html_parser: HtmlParser,
        config: ScraperConfig,
        use_scrolling: bool = True,
    ):
        self._page_scraper = page_scraper
        self._browser_driver = browser_driver
        self._html_parser = html_parser
        self._config = config
        self._use_scrolling = use_scrolling
        self._logger = logging.getLogger(__name__)

    def _deduplicate_products(self, products: list[Product]) -> list[Product]:
        """Remove duplicate products by URL, keeping first occurrence."""
        seen_urls = set()
        unique_products = []

        for product in products:
            if product.url and product.url not in seen_urls:
                seen_urls.add(product.url)
                unique_products.append(product)

        duplicates_count = len(products) - len(unique_products)
        if duplicates_count > 0:
            self._logger.info(f"Removed {duplicates_count} duplicate products")

        return unique_products

    def scrape_all(self) -> list[Product]:
        """Scrape all products using scrolling or pagination."""
        if self._use_scrolling:
            return self._scrape_with_scrolling()
        else:
            return self._scrape_with_pagination()

    def _scrape_with_scrolling(self) -> list[Product]:
        """Scrape all products using infinite scroll."""
        self._logger.info("Using infinite scroll method")

        try:
            html = self._browser_driver.get_all_products_with_scrolling(
                max_scrolls=self._config.max_pages * 3  # More scrolls for more products
            )
            products = self._html_parser.parse_products(html)

            self._logger.info(f"Total products scraped: {len(products)}")
            unique_products = self._deduplicate_products(products)

            return unique_products
        except Exception as e:
            self._logger.error(f"Failed to scrape with scrolling: {e}")
            return []

    def _scrape_with_pagination(self) -> list[Product]:
        """Scrape all pages sequentially using pagination."""
        self._logger.info("Using pagination method")
        all_products = []

        for page in range(1, self._config.max_pages + 1):
            try:
                products = self._page_scraper.scrape(page)
                self._logger.info(f"Page {page} returned {len(products)} products")
                all_products.extend(products)
            except Exception as e:
                self._logger.error(f"Page {page} failed: {e}")

        self._logger.info(f"Total products before deduplication: {len(all_products)}")
        unique_products = self._deduplicate_products(all_products)
        self._logger.info(f"Total unique products: {len(unique_products)}")

        return unique_products


# ============================================================================
# Application (SRP: Application entry point & orchestration)
# ============================================================================


class ScraperApplication:
    """Main application orchestrator."""

    def __init__(
        self,
        scraper: MultiPageScraper,
        storage: Storage | list[Storage],
        browser_driver: BrowserDriver,
    ):
        self._scraper = scraper
        # Support single storage or multiple storages
        self._storages = [storage] if not isinstance(storage, list) else storage
        self._browser_driver = browser_driver
        self._logger = logging.getLogger(__name__)

    def run(self) -> None:
        """Execute the scraping workflow."""
        self._logger.info("Starting Selenium scraper application")

        try:
            products = self._scraper.scrape_all()

            # Save to all configured storages
            for storage in self._storages:
                storage.save(products)

            self._logger.info(f"Scraping completed. Total products: {len(products)}")
        finally:
            # Always close browser
            self._browser_driver.close()


# ============================================================================
# Factory (SRP: Object creation and dependency injection)
# ============================================================================


class ScraperFactory:
    """Factory for creating scraper components with proper dependencies."""

    @staticmethod
    def create_application(
        config: ScraperConfig, output_path: Path, use_scrolling: bool = True
    ) -> ScraperApplication:
        """Create fully configured scraper application."""
        # Infrastructure layer
        browser_driver = SeleniumBrowserDriver(config)
        html_parser = BeautifulSoupHtmlParser()
        storage = TextFileStorage(output_path)

        # Domain layer
        page_scraper = PageScraper(browser_driver, html_parser)
        multi_page_scraper = MultiPageScraper(
            page_scraper,
            browser_driver,
            html_parser,
            config,
            use_scrolling=use_scrolling,
        )

        # Application layer
        return ScraperApplication(multi_page_scraper, storage, browser_driver)


# ============================================================================
# Main Entry Point
# ============================================================================


def setup_logging(level: int = logging.INFO) -> None:
    """Configure logging for the application."""
    logging.basicConfig(level=level, format="[%(levelname)s] %(message)s")


def main() -> None:
    """Main entry point."""
    setup_logging()

    # Configuration (OCP: Open for extension via config)
    config = ScraperConfig(
        base_url="https://alternativeto.net/platform/windows/?license=commercial",
        max_pages=833,  # Number of pages to scrape
        page_load_timeout=20,
        element_wait_timeout=15,  # Increased timeout
        delay_between_pages=0.1,  # Longer delay
        headless=False,  # Cloudflare still detects headless mode even with undetected-chromedriver
    )

    # Output paths for both formats
    txt_output = Path("products_alternativeto_full.txt")
    csv_output = Path("products_alternativeto_sorted.csv")

    # Infrastructure layer
    browser_driver = SeleniumBrowserDriver(config)
    html_parser = BeautifulSoupHtmlParser()

    # Multiple storages: TXT (original order) and CSV (sorted by likes)
    storages = [TextFileStorage(txt_output), CsvStorage(csv_output, sort_by_likes=True)]

    # Domain layer
    page_scraper = PageScraper(browser_driver, html_parser)
    multi_page_scraper = MultiPageScraper(
        page_scraper,
        browser_driver,
        html_parser,
        config,
        use_scrolling=False,  # Use pagination clicking instead of scrolling
    )

    # Application layer
    app = ScraperApplication(multi_page_scraper, storages, browser_driver)
    app.run()

    print(f"\nScraping completed!")
    print(f"Text file: {txt_output}")
    print(f"CSV file (sorted by likes): {csv_output}")


if __name__ == "__main__":
    main()
