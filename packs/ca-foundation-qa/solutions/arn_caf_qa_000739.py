def solve():
    data = [520, 485, 610, 540, 475, 590]
    scale = 2
    orig_range = max(data) - min(data)  # 610 - 475 = 135
    transformed = [x * scale for x in data]
    new_range = max(transformed) - min(transformed)
    # 2 * 135 = 270 => option 1
    return {"value": new_range, "option_key": 1}

if __name__ == "__main__":
    print(solve())
