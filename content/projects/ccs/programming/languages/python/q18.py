import math
my_list = list(range(7))
new_list = list(map(lambda x: math.exp(x) / sum(math.exp(y) for y in my_list), my_list))
print(new_list)
print(sum(new_list)) # checking it all sums to 1
