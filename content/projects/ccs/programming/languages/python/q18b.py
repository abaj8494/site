import numpy as np
def softmax(x):
    return np.exp(x) / sum(np.exp(x))

print(sum(softmax(my_list)))
print(softmax(my_list))
