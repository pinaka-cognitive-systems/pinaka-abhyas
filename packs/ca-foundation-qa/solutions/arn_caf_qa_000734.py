def solve():
    data = [34, 57, 22, 68, 45, 71, 29, 53]
    range_val = max(data) - min(data)
    # 71 - 22 = 49 => option 2
    return {"value": range_val, "option_key": 2}

if __name__ == "__main__":
    print(solve())
