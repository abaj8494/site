import math
matrix = [[1, float('nan'), 3], [4, 5, float('nan')], [7, 8, 9]]
#row_means = [sum(x for x in row if not math.isnan(x)) / sum(1 for x in row if not math.isnan(x)) for row in matrix]
row_means = list(map(lambda x: sum(i for i in x if not math.isnan(i)) / sum(1 for i in x if not math.isnan(i)) , matrix))
print(row_means)
