def solve():
    nominal_2024 = 132   # lakh
    price_index = 110
    base_exports = 80    # lakh
    real_2024 = nominal_2024 * 100 / price_index   # = 120.0
    volume_increase = real_2024 - base_exports      # = 40.0
    option_key = 2  # Rs 40 lakh
    return {"value": volume_increase, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
