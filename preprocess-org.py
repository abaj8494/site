#!/usr/bin/env python3
"""
Preprocessor for Hugo org files that converts org-mode syntax to HTML
within m2* shortcodes while preserving nested shortcodes.
"""

import re
import sys
from pathlib import Path

# Shortcodes to preprocess
SHORTCODES = ['m2prob', 'm2sol', 'm2def', 'm2prop', 'm2proof', 'm2lemm', 'm2rem', 'm2exam']

def convert_org_list_to_html(content):
    """Convert org-mode bullet lists to HTML, but stop at shortcode boundaries."""
    lines = content.split('\n')
    result = []
    in_list = False
    list_items = []
    
    for line in lines:
        stripped = line.strip()
        
        # Check if this line contains a shortcode
        if '{{<' in line or '{{%' in line:
            # Close any open list
            if in_list:
                result.append('<ul>')
                result.extend(list_items)
                result.append('</ul>')
                in_list = False
                list_items = []
            # Add the shortcode line as-is
            result.append(line)
            continue
        
        # Check if this is a list item (starts with "- ")
        if stripped.startswith('- '):
            if not in_list:
                in_list = True
                list_items = []
            # Extract content after "- "
            item_content = stripped[2:]
            list_items.append(f'<li>{item_content}</li>')
        else:
            # Not a list item - close any open list
            if in_list:
                result.append('<ul>')
                result.extend(list_items)
                result.append('</ul>')
                in_list = False
                list_items = []
            # Add the line as-is
            if line or not in_list:  # Preserve empty lines outside lists
                result.append(line)
    
    # Close any remaining open list
    if in_list:
        result.append('<ul>')
        result.extend(list_items)
        result.append('</ul>')
    
    return '\n'.join(result)

def preprocess_shortcode_content(match):
    """Process the content inside a matched shortcode."""
    shortcode_name = match.group(1)
    params = match.group(2)
    content = match.group(3)
    
    # Convert org-mode syntax to HTML in the content
    processed_content = convert_org_list_to_html(content)
    
    # Reconstruct the shortcode with processed content
    return f'{{{{< {shortcode_name}{params} >}}}}\n{processed_content}\n{{{{< /{shortcode_name} >}}}}'

def preprocess_file(content):
    """Preprocess a single file's content."""
    # Process each shortcode type
    for shortcode in SHORTCODES:
        # Pattern to match: {{< shortcode params >}}...content...{{< /shortcode >}}
        # Using non-greedy match and allowing nested shortcodes
        pattern = rf'\{{\{{< ({shortcode})(.*?) >\}}\}}(.*?)\{{\{{< /{shortcode} >\}}\}}'
        
        # Process all matches, working from innermost to outermost
        # We need to process multiple times to handle nesting properly
        max_iterations = 10
        for _ in range(max_iterations):
            new_content = re.sub(pattern, preprocess_shortcode_content, content, flags=re.DOTALL)
            if new_content == content:
                break
            content = new_content
    
    return content

def main():
    if len(sys.argv) != 2:
        print("Usage: preprocess-org.py <file.org>")
        sys.exit(1)
    
    filepath = Path(sys.argv[1])
    
    if not filepath.exists():
        print(f"Error: File {filepath} not found")
        sys.exit(1)
    
    # Read the file
    content = filepath.read_text(encoding='utf-8')
    
    # Preprocess it
    processed = preprocess_file(content)
    
    # Write it back
    filepath.write_text(processed, encoding='utf-8')
    print(f"Preprocessed {filepath}")

if __name__ == '__main__':
    main()

