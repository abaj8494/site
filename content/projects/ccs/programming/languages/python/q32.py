top_n_idx = lambda x,n: list(list(zip(*sorted(enumerate(x), key=lambda x:x[1], reverse=True)))[0][:n:])
print(top_n_idx([1, 2, 6, 4], 3))
