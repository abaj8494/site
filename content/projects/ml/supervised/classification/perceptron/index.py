import numpy as np

#data
a = np.array([1,0,1,-1])
b = np.array([1,2,0,-1])
c = np.array([1,1,1,+1])
X = np.array([a,b,c]) # design matrix
eta = 1.0

w = np.array([-1.5, 0, 2])

errors = len(w)
while errors > 0:
  errors = len(w)
  for x in X:
    # calculate s
    s = x[0] * w[0] + x[1] * w[1] + x[2] * w[2]
    if (s * x[3] > 0): # checks that sign is the same.
      errors -= 1
    else: # updates weight vector.
      if s > 0: #subtract
        w = np.array([j-eta*x[i] for i,j in enumerate(w)])
      else: # add
        w = np.array([j+eta*x[i] for i,j in enumerate(w)])
    print(w)
