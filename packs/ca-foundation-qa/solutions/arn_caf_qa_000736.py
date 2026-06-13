def solve():
    # Grouped distribution: classes 10-20, 20-30, 30-40, 40-50, 50-60
    lower_first = 10
    upper_last = 60
    range_val = upper_last - lower_first
    # 60 - 10 = 50 => option 1
    return {"value": range_val, "option_key": 1}

if __name__ == "__main__":
    print(solve())
