another_list = list(range(20))
odd_lists_minus_one = list(map(lambda x:-1 if x%2==1 else x, another_list))
odd_lists_minus_one
