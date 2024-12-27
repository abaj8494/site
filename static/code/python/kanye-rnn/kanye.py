import numpy as np
import pandas as pd
import tensorflow as tf

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Embedding
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

import lyricsgenius


secret_token = "Cfk9JIHU4uWrbX51iN5K2KumyMCRO4usTv7P5c4YiF9woY0z9gtsgZhNYQzaUdTG"

# Initialize Genius API
genius = lyricsgenius.Genius(secret_token)

# Fetch Kanye West's songs
artist = genius.search_artist("Kanye West", max_songs=100, sort="title")

# Save lyrics to a text file
with open("kanye_lyrics.txt", "w") as file:
    for song in artist.songs:
        file.write(song.lyrics + "\n\n")
