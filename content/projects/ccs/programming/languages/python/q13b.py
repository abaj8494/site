l = list(range(12))
x = [l[x:x+int(len(l)/2)] for x in range(0, len(l), int(len(l)/2))]
print(x)
