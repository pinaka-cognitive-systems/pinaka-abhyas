def solve():
    # Series: 1, 2, 4, 7, 11, 16, 22, ?
    # Differences: 1, 2, 3, 4, 5, 6 (natural numbers)
    series = [1, 2, 4, 7, 11, 16, 22]
    diffs = [series[i+1] - series[i] for i in range(len(series)-1)]
    # diffs = [1, 2, 3, 4, 5, 6]
    next_diff = len(diffs) + 1  # next natural number = 7
    missing = series[-1] + next_diff  # 22 + 7 = 29
    # options: 1->27, 2->28, 3->29, 4->30
    option_map = {27: 1, 28: 2, 29: 3, 30: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
