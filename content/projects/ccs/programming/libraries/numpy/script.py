import re

def extract_exercises(text):
    """
    Extracts exercises from the input text.
    The pattern looks for lines starting with "Exercise <number>:" followed by the question text,
    then stops before the "Solution:" marker.
    """
    # The regex captures:
    #   1. the exercise number (\d+)
    #   2. the question text (non-greedy until "Solution:")
    pattern = re.compile(r"Exercise\s+(\d+):\s*\n\s*(.*?)\n\s*Solution:", re.DOTALL)
    return pattern.findall(text)

def format_exercises(exercises):
    """
    Formats the extracted exercises to the desired output.
    Each exercise is output as:
    
    ** Exercise <number>:
    
    <question text>
    """
    formatted_lines = []
    for number, question in exercises:
        formatted_lines.append(f"** Exercise {number}:\n")
        formatted_lines.append(f"{question.strip()}\n")
    return "\n".join(formatted_lines)

def main():
    # Read the content from input.txt
    with open("input.txt", "r", encoding="utf-8") as infile:
        content = infile.read()
    
    # Extract exercises (number and question text)
    exercises = extract_exercises(content)
    
    # Format the extracted exercises
    formatted_output = format_exercises(exercises)
    
    # Write the formatted output to output.txt
    with open("output.txt", "w", encoding="utf-8") as outfile:
        outfile.write(formatted_output)
    
    print("Formatted questions have been written to output.txt")

if __name__ == "__main__":
    main()

