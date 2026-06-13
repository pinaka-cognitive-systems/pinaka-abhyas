def solve():
    data = [12, 18, 24, 30, 36]
    n = len(data)
    mean = sum(data) / n  # 24
    abs_devs = [abs(x - mean) for x in data]  # 12, 6, 0, 6, 12
    md = sum(abs_devs) / n  # 36 / 5 = 7.2
    # 7.2 => option 3
    return {"value": md, "option_key": 3}

if __name__ == "__main__":
    print(solve())
