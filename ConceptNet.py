#!/usr/bin/env python3
"""
Simple Python script to demonstrate using ConceptNet via Hugging Face Space.
This script looks up information about a concept in English using the
conceptnet_normalized HF Space (since the official API is down).

Usage: python conceptnet_example.py [word]
Example: python conceptnet_example.py dog
"""

import sys
from gradio_client import Client  # type: ignore

SEPARATOR_LENGTH = 50


def search_concept(word):
    """Search for a concept and print its semantic profile."""
    # Initialize the HF Space client
    client = Client("https://cstr-conceptnet-normalized.hf.space")

    print(f"Looking up '{word}' via Hugging Face Space:")
    print("-" * SEPARATOR_LENGTH)

    try:
        # Call the Gradio interface
        result = client.predict(word, api_name="/get_semantic_profile")

        # Print the semantic profile
        print("Semantic Profile:")
        print(result)

    except Exception as e:
        print(f"❌ Error querying HF Space: {e}")


def main():
    if len(sys.argv) > 1:
        word = sys.argv[1]
    else:
        word = "example"  # Default word

    search_concept(word)


if __name__ == "__main__":
    main()
