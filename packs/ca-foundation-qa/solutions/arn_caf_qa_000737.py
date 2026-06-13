def solve():
    range_val = 30
    coeff = 0.25
    # coeff = (Max - Min) / (Max + Min)
    # Max - Min = range_val = 30
    # Max + Min = range_val / coeff = 120
    sum_mm = range_val / coeff  # 120
    max_val = (sum_mm + range_val) / 2  # (120 + 30) / 2 = 75
    # 75 => option 2
    return {"value": max_val, "option_key": 2}

if __name__ == "__main__":
    print(solve())
