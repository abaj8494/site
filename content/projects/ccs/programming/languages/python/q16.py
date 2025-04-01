import random
random.seed(4)
n = 5
l = [ [random.randint(0,n-1) for i in range(n)] for i in range(n)]
print(l)
