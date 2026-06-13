def solve():
    # Series: 1, 2, 4, 7, 11, 16, ?
    series = [1, 2, 4, 7, 11, 16]
    diffs = [series[i+1] - series[i] for i in range(len(series)-1)]
    # diffs = [1, 2, 3, 4, 5]
    second_diffs = [diffs[i+1] - diffs[i] for i in range(len(diffs)-1)]
    # Verify second differences are all 1
    assert all(d == 1 for d in second_diffs)
    next_diff = diffs[-1] + 1  # 5 + 1 = 6
    next_term = series[-1] + next_diff  # 16 + 6 = 22
    options = {1: 20, 2: 21, 3: 22, 4: 23}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
