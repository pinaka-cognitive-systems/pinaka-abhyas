def solve():
    nominal_2024 = 726000
    price_index = 132
    base_year_revenue = 500000
    real_2024 = nominal_2024 * 100 / price_index   # = 550000.0
    increase = real_2024 - base_year_revenue        # = 50000.0
    option_key = 2  # Rs 50,000
    return {"value": increase, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
