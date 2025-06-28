#!/usr/bin/env python3
"""
PDF to Images Converter - Windows Version

This script converts PDF files to image files (PNG, JPEG, etc.)
Each page of the PDF becomes a separate image file.
Includes Windows-specific handling and poppler binary management.
"""

import os
import sys
import zipfile
import requests
from pathlib import Path
from pdf2image import convert_from_path
import argparse
import tempfile
import shutil


def download_poppler_windows():
    """
    Download and extract poppler binaries for Windows if not found
    """
    poppler_path = Path("poppler") / "Library" / "bin"
    
    if poppler_path.exists():
        return str(poppler_path.absolute())
    
    print("Poppler not found. Downloading poppler binaries for Windows...")
    
    # Download URL for poppler Windows binaries
    poppler_url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v23.08.0-0/Release-23.08.0-0.zip"
    
    try:
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "poppler.zip"
            
            # Download poppler
            print("Downloading poppler...")
            response = requests.get(poppler_url, stream=True)
            response.raise_for_status()
            
            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Extract poppler
            print("Extracting poppler...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(".")
            
            # Rename extracted folder to 'poppler'
            extracted_folders = [f for f in os.listdir('.') if f.startswith('poppler-') and os.path.isdir(f)]
            if extracted_folders:
                os.rename(extracted_folders[0], 'poppler')
        
        print("✅ Poppler downloaded and extracted successfully!")
        return str(poppler_path.absolute())
        
    except Exception as e:
        print(f"❌ Failed to download poppler: {e}")
        print("Please download poppler manually from:")
        print("https://github.com/oschwartz10612/poppler-windows/releases/")
        return None


def pdf_to_images(pdf_path, output_dir=None, format='PNG', dpi=200, prefix='page'):
    """
    Convert PDF pages to images - Windows version
    
    Args:
        pdf_path (str): Path to the PDF file
        output_dir (str): Directory to save images (default: same as PDF)
        format (str): Image format (PNG, JPEG, etc.)
        dpi (int): Resolution for conversion
        prefix (str): Prefix for output filenames
    
    Returns:
        list: Paths of generated image files
    """
    pdf_path = Path(pdf_path)
    
    # Validate PDF file exists
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Set output directory
    if output_dir is None:
        output_dir = pdf_path.parent / f"{pdf_path.stem}_images"
    else:
        output_dir = Path(output_dir)
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Converting PDF: {pdf_path}")
    print(f"Output directory: {output_dir}")
    print(f"Format: {format}, DPI: {dpi}")
    
    # Try to find or download poppler
    poppler_path = None
    
    # Check if poppler is in PATH
    if shutil.which("pdftoppm") is None:
        print("Poppler not found in PATH. Checking local installation...")
        poppler_path = download_poppler_windows()
        if poppler_path is None:
            raise RuntimeError("Poppler binaries are required but not found")
    
    try:
        # Convert PDF to images
        if poppler_path:
            images = convert_from_path(
                str(pdf_path.absolute()),
                dpi=dpi,
                fmt=format.lower(),
                poppler_path=poppler_path
            )
        else:
            images = convert_from_path(
                str(pdf_path.absolute()),
                dpi=dpi,
                fmt=format.lower()
            )
        
        image_paths = []
        
        # Save each page as an image
        for i, image in enumerate(images, 1):
            filename = f"{prefix}_{i:03d}.{format.lower()}"
            image_path = output_dir / filename
            
            image.save(str(image_path.absolute()), format)
            image_paths.append(image_path)
            print(f"Saved: {image_path}")
        
        print(f"\n✅ Conversion complete! {len(images)} pages converted.")
        return image_paths
        
    except Exception as e:
        print(f"❌ Error during conversion: {e}")
        return []


def batch_convert(input_dir, output_base_dir=None, **kwargs):
    """
    Convert multiple PDF files in a directory
    
    Args:
        input_dir (str): Directory containing PDF files
        output_base_dir (str): Base directory for output
        **kwargs: Additional arguments for pdf_to_images
    """
    input_path = Path(input_dir)
    
    if not input_path.exists():
        raise FileNotFoundError(f"Input directory not found: {input_path}")
    
    # Find all PDF files
    pdf_files = list(input_path.glob("*.pdf")) + list(input_path.glob("*.PDF"))
    
    if not pdf_files:
        print("No PDF files found in the directory")
        return
    
    print(f"Found {len(pdf_files)} PDF files")
    
    for pdf_file in pdf_files:
        print(f"\n{'='*50}")
        print(f"Processing: {pdf_file.name}")
        
        if output_base_dir:
            output_dir = Path(output_base_dir) / f"{pdf_file.stem}_images"
        else:
            output_dir = pdf_file.parent / f"{pdf_file.stem}_images"
        
        try:
            pdf_to_images(pdf_file, output_dir, **kwargs)
        except Exception as e:
            print(f"❌ Failed to convert {pdf_file.name}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Convert PDF pages to images (Windows version)")
    parser.add_argument("input", help="Path to PDF file or directory containing PDFs")
    parser.add_argument("-o", "--output", help="Output directory")
    parser.add_argument("-f", "--format", default="PNG", 
                       choices=["PNG", "JPEG", "JPG", "TIFF", "BMP"],
                       help="Output image format (default: PNG)")
    parser.add_argument("-d", "--dpi", type=int, default=200,
                       help="Image resolution in DPI (default: 200)")
    parser.add_argument("-p", "--prefix", default="page",
                       help="Filename prefix (default: 'page')")
    parser.add_argument("--batch", action="store_true",
                       help="Process all PDFs in the input directory")
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    
    try:
        if args.batch or input_path.is_dir():
            # Batch processing
            batch_convert(
                input_dir=args.input,
                output_base_dir=args.output,
                format=args.format,
                dpi=args.dpi,
                prefix=args.prefix
            )
        else:
            # Single file processing
            image_paths = pdf_to_images(
                pdf_path=args.input,
                output_dir=args.output,
                format=args.format,
                dpi=args.dpi,
                prefix=args.prefix
            )
            
            if image_paths:
                print(f"\n✅ Successfully converted {len(image_paths)} pages")
            else:
                print("\n❌ Conversion failed")
                sys.exit(1)
                
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
