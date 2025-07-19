def average(l):
    return sum(l)/len(l)

""" takes in list of lists
    returns list of averages, one for each row
"""
def mean_list_of_rows(ml):
  return [average(x) for x in ml]

my_list = [[1,2,3],[4,5],[3,3]]
mean_list_of_rows(my_list)
