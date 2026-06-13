def solve():
    # Series: 2, 6, 18, 54, ?
    series = [2, 6, 18, 54]
    ratio = series[1] / series[0]
    # Verify constant ratio
    for i in range(1, len(series)):
        assert series[i] / series[i-1] == ratio
    next_term = int(series[-1] * ratio)
    # next_term = 162, which maps to option_key 3
    options = {1: 108, 2: 144, 3: 162, 4: 216}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
