import os
import sys
import fitz  # PyMuPDF
from PIL import Image
import io
import argparse


def extract_images_from_pdf(pdf_path, output_dir="temp"):
    """
    Extracts all images from a PDF file and saves them to the specified directory.
    
    Args:
        pdf_path (str): Path to the PDF file
        output_dir (str): Directory to save extracted images
    """
    try:
        # Validate that the PDF file exists
        if not os.path.isfile(pdf_path):
            print(f"Error: PDF file not found: {pdf_path}")
            return

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        print(f"Output directory: {output_dir}")
        
        # Open the PDF
        print(f"Opening PDF: {pdf_path}")
        pdf_document = fitz.open(pdf_path)
        image_count = 0
        
        # Iterate through each page
        total_pages = len(pdf_document)
        print(f"Processing {total_pages} pages...")
        
        for page_num, page in enumerate(pdf_document):
            print(f"Processing page {page_num+1}/{total_pages}")
            
            # Get image list
            image_list = page.get_images(full=True)
            if not image_list:
                print(f"No images found on page {page_num+1}")
                continue
                
            print(f"Found {len(image_list)} images on page {page_num+1}")
            
            # Process each image
            for img_index, img in enumerate(image_list):
                try:
                    # Get the XREF of the image
                    xref = img[0]
                    
                    # Extract the image bytes
                    base_image = pdf_document.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Get image extension
                    image_ext = base_image["ext"]
                    
                    # Load it to PIL
                    image = Image.open(io.BytesIO(image_bytes))
                    
                    # Create a safe filename
                    image_filename = os.path.join(output_dir, f"image_page{page_num+1}_{img_index+1}.{image_ext}")
                    
                    # Save the image
                    image.save(image_filename)
                    
                    image_count += 1
                    print(f"Saved: {image_filename}")
                except Exception as e:
                    print(f"Error processing image {img_index+1} on page {page_num+1}: {str(e)}")
        
        pdf_document.close()
        
        if image_count > 0:
            print(f"\nSuccessfully extracted {image_count} images from {os.path.basename(pdf_path)}")
        else:
            print(f"No images found in {os.path.basename(pdf_path)}")
            
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract images from a PDF file")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--output", "-o", default="temp", help="Output directory (default: temp)")
    
    args = parser.parse_args()
    
    try:
        extract_images_from_pdf(args.pdf_path, args.output)
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        sys.exit(1) 
