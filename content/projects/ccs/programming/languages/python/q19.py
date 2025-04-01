random.seed(4)
list_a = random.choices(range(10),k=10) # without numpy
list_b = random.choices(range(10),k=10)
print(list_a)
print(list_b)
dot_p = sum(list(map(math.prod, zip(list_a,list_b))))
print(dot_p)
