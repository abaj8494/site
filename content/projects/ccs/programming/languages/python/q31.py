import random
random.seed(3)
print([[1 if random.random() > 0.5 else 0 for _ in range(3)] for _ in range(3)])
