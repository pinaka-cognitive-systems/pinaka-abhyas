def solve():
    real_salary = 25000
    price_index = 160
    nominal_salary = real_salary * price_index / 100   # = 40000.0
    option_key = 1  # Rs 40,000
    return {"value": nominal_salary, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
