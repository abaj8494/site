#!/usr/bin/env python3

def main():
    """
    Searches in /usr/share/dict/words (common location on Linux).
    Prints words where:
      - the second letter is 'x'
      - the second-to-last letter is 'n'
    """
    dictionary_path = "/usr/share/dict/words"
    try:
        with open(dictionary_path, "r") as f:
            for word in f:
                w = word.strip()
                if len(w) > 2:
                    # second letter = w[1], second-to-last = w[-2]
                    if w[1] == 'x' and w[-2] == 'n':
                        print(w)
    except FileNotFoundError:
        print(f"Dictionary not found at {dictionary_path}.")
        print("Please adjust the path or provide a suitable word list file.")

if __name__ == "__main__":
    main()
