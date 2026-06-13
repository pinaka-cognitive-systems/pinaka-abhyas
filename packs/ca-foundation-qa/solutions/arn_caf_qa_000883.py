def solve():
    nominal_wage = 18000
    price_index = 150
    base = 100
    real_wage = nominal_wage / price_index * base
    # real_wage = 12000.0
    option_key = 1  # Rs 12,000
    return {"value": real_wage, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
