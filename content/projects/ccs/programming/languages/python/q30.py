import random
matrix = create_n_by_n_list(4)
print(matrix)
matrix[0], matrix[1] = matrix[1], matrix[0]
print(matrix)
