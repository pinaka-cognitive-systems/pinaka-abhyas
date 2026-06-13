def solve():
    nominal_2023 = 450000
    price_index = 125
    base_year_sales = 300000
    real_2023 = nominal_2023 * 100 / price_index   # = 360000
    volume_increase = real_2023 - base_year_sales   # = 60000
    option_key = 2  # Rs 60,000
    return {"value": volume_increase, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
