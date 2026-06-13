def solve():
    # Series: 3, 7, 13, 21, 31, ?
    series = [3, 7, 13, 21, 31]
    diffs = [series[i+1] - series[i] for i in range(len(series)-1)]
    # diffs = [4, 6, 8, 10]
    second_diffs = [diffs[i+1] - diffs[i] for i in range(len(diffs)-1)]
    # second_diffs = [2, 2, 2]
    assert all(d == 2 for d in second_diffs)
    next_diff = diffs[-1] + 2  # 10 + 2 = 12
    next_term = series[-1] + next_diff  # 31 + 12 = 43
    options = {1: 40, 2: 41, 3: 43, 4: 45}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
