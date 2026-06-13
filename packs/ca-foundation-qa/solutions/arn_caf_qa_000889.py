def solve():
    price_index = 125
    purchasing_power = 100 / price_index   # = 0.80
    option_key = 1  # Rs 0.80
    return {"value": purchasing_power, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
