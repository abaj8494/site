import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Embedding
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

# Load the data
with open("cleaned_kanye_lyrics.txt", "r") as file:
    data = file.read()

# Tokenize text
tokenizer = Tokenizer()
tokenizer.fit_on_texts([data])
sequence_data = tokenizer.texts_to_sequences([data])[0]

# Define vocabulary size and max sequence length
vocab_size = len(tokenizer.word_index) + 1
sequence_length = 50

# Create sequences
sequences = []
for i in range(sequence_length, len(sequence_data)):
    seq = sequence_data[i - sequence_length:i]
    sequences.append(seq)

# Convert sequences into numpy array
sequences = np.array(sequences)

# Split sequences into input (X) and output (y)
X, y = sequences[:, :-1], sequences[:, -1]
y = tf.keras.utils.to_categorical(y, num_classes=vocab_size)

# Build the RNN Model
model = Sequential([
    Embedding(input_dim=vocab_size, output_dim=100, input_length=sequence_length - 1),
    LSTM(units=128, return_sequences=True),
    LSTM(units=128),
    Dense(units=vocab_size, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Train the Model
model.fit(X, y, epochs=20, batch_size=32, validation_split=0.2)
model.save('kanye_rnn_model.h5')

# Generate Text
def generate_text(seed_text, next_words, model, tokenizer, max_sequence_len):
    for _ in range(next_words):
        token_list = tokenizer.texts_to_sequences([seed_text])[0]
        token_list = pad_sequences([token_list], maxlen=max_sequence_len - 1, padding='pre')
        predicted = model.predict(token_list, verbose=0)
        output_word = tokenizer.index_word.get(np.argmax(predicted), "")
        seed_text += " " + output_word
    return seed_text.strip()

# Chatbot Interface
if __name__ == "__main__":
    print("Kanye Bot: Hi, I’m Kanye Bot. What’s on your mind?")
    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            print("Kanye Bot: Peace out!")
            break
        response = generate_text(user_input, next_words=20, model=model, tokenizer=tokenizer, max_sequence_len=sequence_length)
        print(f"Kanye Bot: {response}")

