random.seed(4)
mean_cols = lambda l: [
      [l[r][c] / sum(l[i][c] for i in range(len(l[r])))
       for c in range(len(l[r]))]
      for r in range(len(l))
  ]
n = 5
d2_list = [[random.randint(0,10) for _ in range(n)] for _ in range(n)]
print("original matrix:", d2_list)
print(mean_cols(d2_list))
