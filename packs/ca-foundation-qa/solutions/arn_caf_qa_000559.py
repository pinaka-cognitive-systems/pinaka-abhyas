def solve():
    # Series: 1, 1, 2, 3, 5, 8, 13, ?
    series = [1, 1, 2, 3, 5, 8, 13]
    # Verify Fibonacci rule
    for i in range(2, len(series)):
        assert series[i] == series[i-1] + series[i-2]
    next_term = series[-1] + series[-2]  # 13 + 8 = 21
    options = {1: 18, 2: 20, 3: 21, 4: 22}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
