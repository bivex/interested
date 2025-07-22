import json
from collections import defaultdict
import os

def sort_smells_by_type(
    input_file: str, output_dir: str = "sorted_smells"
):
    """
    Reads a JSON file containing implementation smells, groups them by 'Smell' type,
    and writes each group to a separate JSON file.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    smells_by_type = defaultdict(list)

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for entry in data:
                smell_type = entry.get("Smell")
                if smell_type:
                    smells_by_type[smell_type].append(entry)
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{input_file}'. Check file format.")
        return

    for smell_type, entries in smells_by_type.items():
        # Sanitize smell_type for filename (replace spaces and slashes with underscores)
        safe_smell_type = smell_type.replace(" ", "_").replace("/", "_").replace("\\", "_")
        output_file = os.path.join(output_dir, f"{safe_smell_type.lower()}_smells.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(entries, f, indent=4)
        print(f"Created '{output_file}' with {len(entries)} entries for '{smell_type}' smells.")

if __name__ == "__main__":
    sort_smells_by_type("out/mcpproxy_implementation_smells.json") 
