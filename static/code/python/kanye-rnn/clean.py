import re

# Load raw lyrics
with open("kanye_lyrics.txt", "r") as file:
	raw_data = file.read()

	# Clean lyrics
	cleaned_data = re.sub(r"\[.*?\]", "", raw_data)  # Remove metadata like [Chorus]
	cleaned_data = re.sub(r"\s+", " ", cleaned_data)  # Replace multiple spaces with one

	# Save cleaned lyrics
	with open("cleaned_kanye_lyrics.txt", "w") as file:
		file.write(cleaned_data)


