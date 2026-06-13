def solve():
    # Series: 3, 6, 9, 12, ?
    series = [3, 6, 9, 12]
    diff = series[1] - series[0]
    # Verify constant difference
    for i in range(1, len(series)):
        assert series[i] - series[i-1] == diff
    next_term = series[-1] + diff
    # next_term = 15, which maps to option_key 2
    options = {1: 14, 2: 15, 3: 16, 4: 18}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
