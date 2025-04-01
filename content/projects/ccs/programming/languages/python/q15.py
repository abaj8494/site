l1 = list(range(4))[::-1]
l2 = list(range(7))
l1.extend(l2)
s = list(set(l1))
print(s)
