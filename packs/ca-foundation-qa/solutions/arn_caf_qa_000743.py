def solve():
    data = [28, 10, 37, 15, 20]
    n = len(data)
    data_sorted = sorted(data)
    # median = middle value for odd n
    median = data_sorted[n // 2]  # data_sorted[2] = 20
    abs_devs = [abs(x - median) for x in data]
    md = sum(abs_devs) / n  # 40 / 5 = 8.0
    # 8.0 => option 1
    return {"value": md, "option_key": 1}

if __name__ == "__main__":
    print(solve())
