def count_elements_within_range(a, b, x):
    return sum(a <= y <= b for y in x)
count_elements_within_range(5, 12, list(range(14))[5::3])
