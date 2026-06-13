def solve():
    data = [320, 450, 280, 510, 390, 620, 410]
    range_val = max(data) - min(data)
    # 620 - 280 = 340 => option 1
    return {"value": range_val, "option_key": 1}

if __name__ == "__main__":
    print(solve())
