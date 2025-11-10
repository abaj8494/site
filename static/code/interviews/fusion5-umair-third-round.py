# average_age = 18 + 19 + 50 / 3 = 29
# average_purchase = 180 + 50 + 250 + 1050 + 10 = 308

data = [
  {'name': 'alice', 'age': 10, 'purchase': 180},
  {'name': 'bob', 'age': 18, 'purchase': None},
  {'name': 'charlie', 'age': 19, 'purchase': 50},
  {'name': 'dave', 'age': None, 'purchase': 250},
  {'name': 'elisa', 'age': 50, 'purchase': 1050},
  {'name': 'felix', 'age': None, 'purchase': 10},
]


"""
returns tuple of average_age and average_purchase
"""

"""
interpolates Nonetype values for age and purchases with averages
"""
def clean_data(data: list) -> list:
  def calculate_averages(data: list) -> tuple:
    age_count, purchase_count = 0, 0
    cum_age, cum_purchase = 0, 0
    for customer in data:
      if customer['age']:
        cum_age += customer['age']
        age_count += 1
      if customer['purchase']:
        cum_purchase += customer['purchase']
        purchase_count += 1
    return (cum_age / age_count , cum_purchase / purchase_count)


  res = []
  for customer in data:
    if (customer['age']) and (customer['age'] < 18 or customer['age'] > 100) :
      continue
    res.append(customer)
  average_age, average_purchase = calculate_averages(res)

  for customer in res:
    if not customer['age']: # is none
      customer['age'] = average_age
    if not customer['purchase']: # is none
      customer['purchase'] = average_purchase

  return res


print(f"Original Data: {data}")
cleaned_data = clean_data(data)
print(f"Cleaned Data: {cleaned_data}")
