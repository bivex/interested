#python slicer_pdf.py "h.pdf" "1-19,19-36" --split

#!/usr/bin/env python3
"""
PDF Slicer - Extract specific page ranges from PDF files
Usage: python slicer_pdf.py "input.pdf" "1-10,15-20" [--split]
"""

import argparse
import sys
from pathlib import Path
try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter
    except ImportError:
        print("Error: Please install pypdf or PyPDF2")
        print("Run: pip install pypdf")
        sys.exit(1)


def parse_page_ranges(range_string):
    """
    Parse page range string like "1-10,15-20,25" into list of page numbers.
    Returns 0-based page indices.
    """
    pages = set()
    ranges = range_string.split(',')
    
    for range_part in ranges:
        range_part = range_part.strip()
        if '-' in range_part:
            start, end = range_part.split('-', 1)
            start_page = int(start.strip()) - 1  # Convert to 0-based
            end_page = int(end.strip()) - 1      # Convert to 0-based
            pages.update(range(start_page, end_page + 1))
        else:
            # Single page
            page_num = int(range_part.strip()) - 1  # Convert to 0-based
            pages.add(page_num)
    
    return sorted(list(pages))


def extract_pages(input_pdf, page_indices):
    """Extract specified pages from PDF and return a PdfWriter object."""
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    
    total_pages = len(reader.pages)
    
    for page_idx in page_indices:
        if 0 <= page_idx < total_pages:
            writer.add_page(reader.pages[page_idx])
        else:
            print(f"Warning: Page {page_idx + 1} is out of range (PDF has {total_pages} pages)")
    
    return writer


def create_output_filename(input_file, range_string, split_index=None):
    """Create output filename based on input file and page range."""
    input_path = Path(input_file)
    stem = input_path.stem
    suffix = input_path.suffix
    
    if split_index is not None:
        return f"{stem}_part{split_index + 1}{suffix}"
    else:
        # Clean up range string for filename
        clean_range = range_string.replace(',', '_').replace('-', 'to')
        return f"{stem}_pages_{clean_range}{suffix}"


def main():
    parser = argparse.ArgumentParser(
        description="Extract specific page ranges from PDF files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python slicer_pdf.py "document.pdf" "1-10"
  python slicer_pdf.py "document.pdf" "1-10,15-20,25"
  python slicer_pdf.py "document.pdf" "1-19,19-36" --split
        """
    )
    
    parser.add_argument("input_pdf", help="Input PDF file path")
    parser.add_argument("page_ranges", help="Page ranges (e.g., '1-10,15-20,25')")
    parser.add_argument("--split", action="store_true", 
                       help="Create separate files for each range")
    parser.add_argument("-o", "--output", help="Output filename (ignored with --split)")
    
    args = parser.parse_args()
    
    # Check if input file exists
    input_path = Path(args.input_pdf)
    if not input_path.exists():
        print(f"Error: Input file '{args.input_pdf}' not found")
        sys.exit(1)
    
    try:
        if args.split:
            # Split mode: create separate files for each range
            ranges = args.page_ranges.split(',')
            
            for i, range_part in enumerate(ranges):
                range_part = range_part.strip()
                page_indices = parse_page_ranges(range_part)
                
                if not page_indices:
                    print(f"Warning: No valid pages in range '{range_part}'")
                    continue
                
                writer = extract_pages(args.input_pdf, page_indices)
                output_filename = create_output_filename(args.input_pdf, range_part, i)
                
                with open(output_filename, 'wb') as output_file:
                    writer.write(output_file)
                
                print(f"Created: {output_filename} (pages {min(page_indices)+1}-{max(page_indices)+1})")
        
        else:
            # Normal mode: single output file with all specified pages
            page_indices = parse_page_ranges(args.page_ranges)
            
            if not page_indices:
                print("Error: No valid pages specified")
                sys.exit(1)
            
            writer = extract_pages(args.input_pdf, page_indices)
            
            if args.output:
                output_filename = args.output
            else:
                output_filename = create_output_filename(args.input_pdf, args.page_ranges)
            
            with open(output_filename, 'wb') as output_file:
                writer.write(output_file)
            
            print(f"Created: {output_filename} ({len(page_indices)} pages)")
    
    except ValueError as e:
        print(f"Error parsing page ranges: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error processing PDF: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
