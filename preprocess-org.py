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

def convert_org_to_html(content):
    """Convert org-mode syntax to HTML, but stop at shortcode boundaries."""
    lines = content.split('\n')
    result = []
    in_unordered_list = False
    in_ordered_list = False
    list_items = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip lines that already contain HTML tags (already processed)
        if '<li>' in line or '<ul>' in line or '<ol>' in line or '<strong>' in line or '<em>' in line or '<code>' in line:
            # Close any open list
            if in_unordered_list:
                result.append('<ul>')
                result.extend(list_items)
                result.append('</ul>')
                in_unordered_list = False
                list_items = []
            elif in_ordered_list:
                result.append('<ol>')
                result.extend(list_items)
                result.append('</ol>')
                in_ordered_list = False
                list_items = []
            result.append(line)
            continue
        
        # Check if this line contains a shortcode - preserve as-is
        if '{{<' in line or '{{%' in line:
            # Close any open list
            if in_unordered_list:
                result.append('<ul>')
                result.extend(list_items)
                result.append('</ul>')
                in_unordered_list = False
                list_items = []
            elif in_ordered_list:
                result.append('<ol>')
                result.extend(list_items)
                result.append('</ol>')
                in_ordered_list = False
                list_items = []
            # Add the shortcode line as-is
            result.append(line)
            continue
        
        # Check for unordered list (starts with "- ")
        if stripped.startswith('- '):
            # Close ordered list if open
            if in_ordered_list:
                result.append('<ol>')
                result.extend(list_items)
                result.append('</ol>')
                in_ordered_list = False
                list_items = []
            
            if not in_unordered_list:
                in_unordered_list = True
                list_items = []
            # Extract content after "- "
            item_content = stripped[2:]
            list_items.append(f'<li>{item_content}</li>')
            continue
        
        # Check for ordered lists: "a. ", "a) ", "1. ", "1) "
        ordered_match = re.match(r'^([a-z0-9]+)[\.\)]\s+(.+)$', stripped)
        if ordered_match:
            # Close unordered list if open
            if in_unordered_list:
                result.append('<ul>')
                result.extend(list_items)
                result.append('</ul>')
                in_unordered_list = False
                list_items = []
            
            if not in_ordered_list:
                in_ordered_list = True
                list_items = []
            item_content = ordered_match.group(2)
            list_items.append(f'<li>{item_content}</li>')
            continue
        
        # Not a list item - close any open list
        if in_unordered_list:
            result.append('<ul>')
            result.extend(list_items)
            result.append('</ul>')
            in_unordered_list = False
            list_items = []
        elif in_ordered_list:
            result.append('<ol>')
            result.extend(list_items)
            result.append('</ol>')
            in_ordered_list = False
            list_items = []
        
        # Add the line as-is (preserving all whitespace)
        result.append(line)
    
    # Close any remaining open list
    if in_unordered_list:
        result.append('<ul>')
        result.extend(list_items)
        result.append('</ul>')
    elif in_ordered_list:
        result.append('<ol>')
        result.extend(list_items)
        result.append('</ol>')
    
    # Join back, then apply inline formatting ONLY if not already processed
    text = '\n'.join(result)
    
    # Don't apply inline formatting if HTML tags already present
    if '<strong>' in text or '<em>' in text or '<code>' in text:
        return text
    
    # Convert org-mode bold: *text* -> <strong>text</strong>
    # Match *text with spaces* but not math operators or asterisks in other contexts
    # Requires word boundary before * and after *, doesn't cross lines
    text = re.sub(r'\B\*([^\*\n]+?)\*\B', r'<strong>\1</strong>', text)
    
    # Convert org-mode italic: _text_ -> <em>text</em>
    # Match _text with spaces_
    text = re.sub(r'\b_([^_\n]+?)_\b', r'<em>\1</em>', text)
    
    # Convert org-mode italic: /text/ -> <em>text</em>
    # Match /text with spaces/, not preceded/followed by word chars
    text = re.sub(r'(?<!\w)/([^/\n]+?)/(?!\w)', r'<em>\1</em>', text)
    
    # Convert org-mode code: =text= -> <code>text</code>
    # ONLY if not inside math (no dollar signs nearby)
    # Org-mode code typically doesn't contain spaces
    text = re.sub(r'(?<!\$)=([^=\s\n]+)=(?!\$)', r'<code>\1</code>', text)
    
    # Convert org-mode code: ~text~ -> <code>text</code>
    text = re.sub(r'~([^~\s\n]+)~', r'<code>\1</code>', text)
    
    return text

def preprocess_shortcode_content(match):
    """Process the content inside a matched shortcode."""
    shortcode_name = match.group(1)
    params = match.group(2)
    content = match.group(3)
    
    # Convert org-mode syntax to HTML in the content
    processed_content = convert_org_to_html(content)
    
    # Reconstruct the shortcode with processed content
    return f'{{{{< {shortcode_name}{params} >}}}}{processed_content}{{{{< /{shortcode_name} >}}}}'

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

