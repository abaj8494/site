new_list = list(range(-5, 4))
tuple_list = filter(lambda t: t[1] != 0, enumerate(new_list)) # filter correct tuples
out_list = [e[0] for e in tuple_list] # construct list of indices
out_list
