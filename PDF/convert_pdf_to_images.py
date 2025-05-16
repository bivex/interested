#!/usr/bin/env python
# Required packages to install:
# pip install PyMuPDF Pillow tqdm psutil
#
# PyMuPDF - PDF processing library (also known as fitz)
# Pillow - Image processing library
# tqdm - Progress bar
# psutil - Process and system utilities

import os
import sys
import fitz  # PyMuPDF
from PIL import Image
import io
import argparse
import time
import multiprocessing
from concurrent.futures import ProcessPoolExecutor, as_completed
from tqdm import tqdm
import psutil


def process_page(page_data):
    """
    Process a single PDF page in a separate process.
    
    Args:
        page_data (tuple): (pdf_path, page_num, output_dir, ext, format, quality, dpi_info)
    
    Returns:
        tuple: (page_num, success, message)
    """
    try:
        pdf_path, page_num, output_dir, ext, format, quality, dpi_info = page_data
        
        # Open the PDF and get the specific page
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        
        # Get zoom factor from passed dpi_info
        zoom_factor = dpi_info[1]
        calculated_dpi = dpi_info[0]
        
        # Set up rendering matrix
        matrix = fitz.Matrix(zoom_factor, zoom_factor)
        
        # Render page to pixmap with optimal memory settings
        pixmap = page.get_pixmap(matrix=matrix, alpha=True)
        
        # Convert to PIL Image with proper memory handling
        if pixmap.alpha:
            img = Image.frombytes("RGBA", [pixmap.width, pixmap.height], pixmap.samples)
        else:
            img = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
        
        # Create filename
        image_filename = os.path.join(output_dir, f"page_{page_num + 1}.{ext}")
        
        # Save the image with appropriate settings for each format
        if format == "JPEG":
            # Convert RGBA to RGB for JPEG which doesn't support alpha
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(image_filename, format=format, quality=quality, optimize=True)
        elif format == "TIFF":
            img.save(image_filename, format=format, compression="tiff_lzw")
        else:  # PNG
            img.save(image_filename, format=format, optimize=True)
        
        # Clean up
        img.close()
        pixmap = None
        doc.close()
        
        return (page_num, True, image_filename)
    except Exception as e:
        return (page_num, False, str(e))


def screenshot_pdf_pages(pdf_path, output_dir="temp", dpi=None, format="PNG", quality=95, num_workers=None):
    """
    Takes screenshots of all pages in a PDF file and saves them as high-quality images.
    Uses multiprocessing for high performance.

    Args:
        pdf_path (str): Path to the PDF file
        output_dir (str): Directory to save screenshot images
        dpi (int): Resolution in dots per inch (if None, calculated automatically)
        format (str): Image format (PNG, JPEG, TIFF)
        quality (int): Image quality (1-100, only applies to JPEG)
        num_workers (int): Number of worker processes (default: CPU count - 1)
    """
    start_time = time.time()
    
    try:
        # Validate that the PDF file exists
        if not os.path.isfile(pdf_path):
            print(f"Error: PDF file not found: {pdf_path}")
            return

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        print(f"Output directory: {output_dir}")

        # Set number of workers intelligently
        if num_workers is None:
            num_workers = max(1, multiprocessing.cpu_count() - 1)
        print(f"Using {num_workers} worker processes")
        
        # Format validation and extension
        format = format.upper()
        if format not in ["PNG", "JPEG", "TIFF"]:
            print(f"Unsupported format '{format}', defaulting to PNG")
            format = "PNG"
        
        # Set file extension based on format
        if format == "JPEG":
            ext = "jpg"
        elif format == "TIFF":
            ext = "tiff"
        else:
            ext = "png"
            
        # Open the PDF - we need to check page count but will close it immediately
        print(f"Opening PDF: {pdf_path}")
        pdf_document = fitz.open(pdf_path)
        
        # Get total pages
        total_pages = len(pdf_document)
        print(f"Processing {total_pages} pages...")
        
        # Calculate shared DPI setting for all pages to ensure consistent output
        # Get dimensions from first page (assuming all pages have similar dimensions)
        if total_pages > 0:
            first_page = pdf_document[0]
            page_rect = first_page.rect
            width_in_points = page_rect.width
            height_in_points = page_rect.height
            
            if dpi is None:
                target_max_dimension = 4000  # pixels
                width_dpi = target_max_dimension / (width_in_points / 72)
                height_dpi = target_max_dimension / (height_in_points / 72)
                calculated_dpi = min(width_dpi, height_dpi)
                # Round to nearest 50 and ensure minimum quality
                calculated_dpi = max(150, round(calculated_dpi / 50) * 50)
                print(f"Auto-calculated DPI: {calculated_dpi}")
                zoom_factor = calculated_dpi / 72
            else:
                calculated_dpi = dpi
                zoom_factor = dpi / 72
                
            dpi_info = (calculated_dpi, zoom_factor)
        
        # Close the document - we'll reopen it in each worker process
        pdf_document.close()
        
        # Prepare work items for multiprocessing
        # Each worker will open the PDF independently for their assigned page
        work_items = []
        for page_num in range(total_pages):
            work_item = (pdf_path, page_num, output_dir, ext, format, quality, dpi_info)
            work_items.append(work_item)
        
        # Process pages in parallel with progress bar
        success_count = 0
        error_count = 0
        
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            # Submit all tasks
            futures = {executor.submit(process_page, item): item[1] for item in work_items}
            
            # Process results with progress bar
            with tqdm(total=total_pages, desc="Processing pages") as pbar:
                for future in as_completed(futures):
                    page_num, success, message = future.result()
                    if success:
                        success_count += 1
                    else:
                        error_count += 1
                        print(f"Error processing page {page_num + 1}: {message}")
                    pbar.update(1)
        
        # Report memory usage
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        print(f"Memory used: {memory_info.rss / (1024 * 1024):.2f} MB")
        
        # Report performance statistics
        elapsed_time = time.time() - start_time
        print(f"\nProcessing completed in {elapsed_time:.2f} seconds")
        print(f"Average time per page: {elapsed_time / total_pages:.2f} seconds")
        print(f"Pages per second: {total_pages / elapsed_time:.2f}")
        print(f"Successfully processed {success_count} pages, {error_count} errors")

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Save PDF pages as high-quality images")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--output", "-o", default="temp", help="Output directory (default: temp)")
    parser.add_argument("--dpi", "-d", type=int, help="Output resolution in DPI (default: auto-calculated)")
    parser.add_argument("--format", "-f", default="PNG", choices=["PNG", "JPEG", "TIFF"], 
                        help="Output image format (default: PNG)")
    parser.add_argument("--quality", "-q", type=int, default=95, 
                        help="Image quality for JPEG format (1-100, default: 95)")
    parser.add_argument("--workers", "-w", type=int, 
                        help="Number of worker processes (default: CPU count - 1)")

    args = parser.parse_args()

    try:
        screenshot_pdf_pages(args.pdf_path, args.output, args.dpi, args.format, args.quality, args.workers)
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        sys.exit(1) 
