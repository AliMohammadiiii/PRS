#!/usr/bin/env python
"""
Filter classifications data from fixture file (since it's seeded by migrations).
"""
import json
import sys
import logging

logger = logging.getLogger(__name__)

def filter_classifications(input_file, output_file):
    """Remove classifications data from fixture file."""
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    filtered = [obj for obj in data if not obj['model'].startswith('classifications.')]
    
    with open(output_file, 'w') as f:
        json.dump(filtered, f, indent=2)
    
    removed = len(data) - len(filtered)
    logger.info(f"Removed {removed} classifications objects (seeded by migrations)")
    logger.info(f"Kept {len(filtered)} objects")
    logger.info(f"Filtered data saved to {output_file}")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'data.json'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'data_filtered.json'
    
    filter_classifications(input_file, output_file)

