def solve():
    # Series: 2, 5, 11, 20, 32, 47, ?
    series = [2, 5, 11, 20, 32, 47]
    first_diffs = [series[i+1] - series[i] for i in range(len(series)-1)]
    # first_diffs = [3, 6, 9, 12, 15]
    second_diffs = [first_diffs[i+1] - first_diffs[i] for i in range(len(first_diffs)-1)]
    # second_diffs = [3, 3, 3, 3]
    assert all(d == 3 for d in second_diffs), f"Second diffs not constant: {second_diffs}"
    next_first_diff = first_diffs[-1] + second_diffs[-1]  # 15 + 3 = 18
    next_term = series[-1] + next_first_diff  # 47 + 18 = 65
    options = {1: 62, 2: 64, 3: 65, 4: 68}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
