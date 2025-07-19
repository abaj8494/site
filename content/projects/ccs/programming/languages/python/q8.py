import random
random.seed(4)
def create_n_by_n_list(n):
      return [[random.randint(0,n) for i in range(n)] for i in list(range(0,n))]
def normalise_list(l, n):
      import numpy
      return numpy.array(l) / n
my_list = create_n_by_n_list(6)
norm_list = normalise_list(my_list, 6)
print(norm_list)
