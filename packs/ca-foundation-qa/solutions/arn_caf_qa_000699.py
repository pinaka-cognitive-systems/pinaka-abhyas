def solve():
    data = [12, 18, 24, 31, 39, 45, 52]
    data_sorted = sorted(data)
    n = len(data_sorted)
    # n=7 is odd, median at position (n+1)/2 = 4 (1-indexed)
    median = data_sorted[(n + 1) // 2 - 1]
    options = {1: 24, 2: 31, 3: 35, 4: 39}
    option_key = [k for k, v in options.items() if v == median][0]
    return {"value": median, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
