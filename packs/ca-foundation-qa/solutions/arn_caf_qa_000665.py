def solve():
    raw_materials = 180000
    labour = 120000
    overheads = 60000
    profit = 40000
    total = raw_materials + labour + overheads + profit  # 400000
    labour_angle = (labour / total) * 360  # (120000/400000)*360 = 108
    return {"value": labour_angle, "option_key": 1}

if __name__ == "__main__":
    print(solve())
