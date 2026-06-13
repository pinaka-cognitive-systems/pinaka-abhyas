def solve():
    # Series: 7, 12, 19, 28, 39, ?
    # Differences: 5, 7, 9, 11 (AP with +2 each step)
    series = [7, 12, 19, 28, 39]
    diffs = [series[i+1] - series[i] for i in range(len(series)-1)]
    # diffs = [5, 7, 9, 11]
    # differences increase by 2 each step
    next_diff = diffs[-1] + 2  # 11 + 2 = 13
    missing = series[-1] + next_diff  # 39 + 13 = 52
    # options: 1->48, 2->50, 3->52, 4->56
    option_map = {48: 1, 50: 2, 52: 3, 56: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
