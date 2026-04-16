"""Extract chapters from PDF into separate text files."""
import sys
import re
from pathlib import Path
from PyPDF2 import PdfReader


# All 26 chapters with partial titles for fuzzy matching
CHAPTER_TITLES = {
    1: "ДЕСЯТЬ ПРИНЦИПОВ",
    2: "ДУМАЙТЕ КАК ЭКОНОМИСТ",
    3: "ВЗАИМОЗАВИСИМОСТЬ",
    4: "РЫНОЧНЫЕ СИЛЫ",
    5: "ЭЛАСТИЧНОСТЬ",
    6: "СПРОС, ПРЕДЛОЖЕНИЕ И ГОСУДАРСТВЕННАЯ",
    7: "ПОТРЕБИТЕЛИ, ПРОИЗВОДИТЕЛИ",
    8: "ПРАКТИЧЕСКОЕ ПРИМЕНЕНИЕ ТЕОРИИ",
    9: "ВНЕШНИЕ ЭФФЕКТЫ",
    10: "ОБЩЕСТВЕННЫЕ БЛАГА",
    11: "ИЗДЕРЖКИ ПРОИЗВОДСТВА",
    12: "ФИРМЫ НА КОНКУРЕНТНЫХ",
    13: "МОНОПОЛИЯ",
    14: "МОНОПОЛИСТИЧЕСКАЯ КОНКУРЕНЦИЯ",
    15: "ОЛИГОПОЛИЯ",
    16: "РЫНКИ ФАКТОРОВ",
    17: "ГРАНИЦЫ МИКРОЭКОНОМИКИ",
    18: "КАК ИЗМЕРЯЕТСЯ НАЦИОНАЛЬНЫЙ",
    19: "ИЗМЕРЕНИЕ СТОИМОСТИ ЖИЗНИ",
    20: "ПРОИЗВОДСТВО И ЭКОНОМИЧЕСКИЙ РОСТ",
    21: "СБЕРЕЖЕНИЯ, ИНВЕСТИЦИИ",
    22: "СОВОКУПНЫЙ СПРОС",
    23: "ВЫБОР МЕЖДУ ИНФЛЯЦИЕЙ",
    24: "ФИНАНСОВЫЙ КРИЗИС",
    25: "ЗОНЫ ОБЩЕЙ ВАЛЮТЫ",
    26: "ПЯТЬ ПРОБЛЕМ МАКРОЭКОНОМИЧЕСКОЙ",
}


def extract_chapters(pdf_path, output_dir):
    """Extract PDF text and split into chapter files."""
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    # Read all pages
    reader = PdfReader(pdf_path)
    total = len(reader.pages)
    print(f"PDF: {pdf_path} ({total} pages)")

    full_text = []
    for i, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        full_text.append(text)
        if i % 50 == 0:
            print(f"  Read {i}/{total} pages...")

    all_text = "\n".join(full_text)
    lines = all_text.split("\n")

    # Strategy: for each chapter number, find the first occurrence
    # of "Глава X" in the BODY of the text (after the table of contents).
    # Skip the TOC area (first ~520 lines).
    toc_end = 520

    chapter_starts = []

    for num in sorted(CHAPTER_TITLES.keys()):
        pattern = rf"Глава\s+{num}\b"
        found = False

        # Pass 1: exact standalone match "Глава X" on its own line
        for i in range(toc_end, len(lines)):
            if re.match(rf"^Глава\s+{num}\s*$", lines[i].strip()):
                title = _get_title(lines, i)
                chapter_starts.append((i, num, title))
                print(f"  [pass1] Глава {num} — {title[:60]} (line {i})")
                found = True
                break

        if found:
            continue

        # Pass 2: "Глава X" anywhere in a line (merged with other text)
        for i in range(toc_end, len(lines)):
            if re.search(pattern, lines[i]):
                title = CHAPTER_TITLES[num]
                chapter_starts.append((i, num, title))
                print(f"  [pass2] Глава {num} — {title[:60]} (line {i})")
                found = True
                break

        if found:
            continue

        # Pass 3: search for the chapter title keywords
        keywords = CHAPTER_TITLES[num].split(",")[0].strip()
        for i in range(toc_end, len(lines)):
            clean = lines[i].strip().upper()
            # Remove common OCR noise
            clean = clean.replace("·", "").replace(".", "").replace('"', "")
            if keywords in clean and num in [int(x) for x in re.findall(r"\d+", lines[i]) if 1 <= int(x) <= 26]:
                title = CHAPTER_TITLES[num]
                chapter_starts.append((i, num, title))
                print(f"  [pass3] Глава {num} — {title[:60]} (line {i})")
                found = True
                break

        if not found:
            print(f"  [MISS] Глава {num} not found!")

    # Sort by line position
    chapter_starts.sort(key=lambda x: x[0])

    # Write each chapter
    for idx, (start, num, title) in enumerate(chapter_starts):
        end = chapter_starts[idx + 1][0] if idx + 1 < len(chapter_starts) else len(lines)
        chapter_text = "\n".join(lines[start:end]).strip()

        filename = f"Chapter{num:02d}.txt"
        filepath = output_dir / filename
        filepath.write_text(chapter_text, encoding="utf-8")
        print(f"  Wrote {filename} ({end - start} lines)")

    print(f"\nDone. {len(chapter_starts)}/{len(CHAPTER_TITLES)} chapters saved to {output_dir}/")


def _get_title(lines, i):
    """Get chapter title from lines following the 'Глава X' line."""
    for j in range(i + 1, min(i + 5, len(lines))):
        t = lines[j].strip()
        if t and not t.startswith("©") and len(t) > 3:
            return t
    return ""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_chapters.py <input.pdf> [output_dir]")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "chapters"
    extract_chapters(pdf_path, output_dir)
