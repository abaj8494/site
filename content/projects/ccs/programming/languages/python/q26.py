# note this program only works for odd n
n = 3
mat = np.ones((n,n))
mat[n//2][n//2] = 0
print(mat)
