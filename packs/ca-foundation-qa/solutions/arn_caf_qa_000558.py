def solve():
    # Series: 100, 96, 92, 88, ?
    series = [100, 96, 92, 88]
    diff = series[1] - series[0]  # -4
    # Verify constant difference
    for i in range(1, len(series)):
        assert series[i] - series[i-1] == diff
    next_term = series[-1] + diff  # 88 + (-4) = 84
    options = {1: 82, 2: 84, 3: 85, 4: 86}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
