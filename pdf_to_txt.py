import sys
from PyPDF2 import PdfReader


def pdf_to_text(pdf_path, output_path=None):
    """Extract text from a PDF file and save as TXT."""
    if output_path is None:
        output_path = pdf_path.rsplit(".", 1)[0] + ".txt"

    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    print(f"PDF: {pdf_path}")
    print(f"Pages: {total_pages}")

    with open(output_path, "w", encoding="utf-8") as f:
        for i, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            f.write(text)
            f.write("\n")
            if i % 20 == 0:
                print(f"  Processed {i}/{total_pages} pages...")

    print(f"Done. Saved to: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_txt.py <input.pdf> [output.txt]")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    pdf_to_text(pdf_path, output_path)
