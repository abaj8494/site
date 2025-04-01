l1 = list(range(6))
l2 = list(range(2,7))
l1.extend(l2)
uniq = list(set(l1))
counts = {x: l1.count(x) for x in l1}
print(counts)
print(uniq)
