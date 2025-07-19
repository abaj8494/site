list_ints = list(range(15))
neg_list = list(map(lambda x: -x if x % 2 == 0 else x, list_ints))
neg_list
