print("\n")
print("*"*80)
print("*"*10+"\t\tQ1"+"\t"*5+"*"*10+"*"*6)
print("*"*80)
print("\n")

"""no docstring required because it was just a 1-liner"""
even_numbers = [x for x in range(10) if x % 2 == 0]
print(even_numbers)


print("\n")
print("*"*80)
print("*"*10+"\t\tQ2"+"\t"*5+"*"*10+"*"*6)
print("*"*80)
print("\n")
"""
takes in input as a string and then returns a dictionary with each word in
that string as a key, and the corresponding word length as value.
"""
print("Q2")
def count_words(text: str) -> dict[str, int]:

    words = text.split()

    return {word: len(word) for word in words}


print(count_words("this is a sentence of words"))

def my_count_words(input):

    my_dict = dict()
    #the_words = [word for word in input]
    the_words = input.split()

    for key in the_words:
        my_dict[key] = len(key)

    return my_dict

print(my_count_words("this is a sentence of words"))


print("\n")
print("*"*80)
print("*"*10+"\t\tQ3"+"\t"*5+"*"*10+"*"*6)
print("*"*80)
print("\n")
"""
create a function that takes in a value and a dictionary and returns a list of keys that match that value
"""
def my_func(my_value, my_dict):
    return_list = []
    for k, v in my_dict.items():
        if v == my_value:
            return_list.append(k)
    return return_list
            
print(my_func(5, {"first": 1, "fifth": 5, "third": 5}))
