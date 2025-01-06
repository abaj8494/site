import numpy as np

#data; note the 1's forming the bias component of our model
a = np.array([1,0,1,-1])
b = np.array([1,2,0,-1])
c = np.array([1,1,1,+1])
X = np.array([a,b,c]) # design matrix
eta = 1.0

w = np.array([0, 0, 0])

continue_training = True
while continue_training:
    total_errors = 0  # reset error count for new iteration
    for x in X:
        # calculate s
        s = x[0] * w[0] + x[1] * w[1] + x[2] * w[2]
        if (s * x[3] <= 0): # if misclassified
            if s > 0: #subtract
                w = np.array([j-eta*x[i] for i,j in enumerate(w)])
            else: # add
                w = np.array([j+eta*x[i] for i,j in enumerate(w)])
            total_errors += 1
        print(w)
    print(f"Errors in this iteration: {total_errors}")
    continue_training = (total_errors > 0)
