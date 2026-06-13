def solve():
    # Series: 3, 6, 11, 18, 27, 38, ?
    # Differences: 3, 5, 7, 9, 11 (odd numbers, increasing by 2)
    series = [3, 6, 11, 18, 27, 38]
    diffs = [series[i+1] - series[i] for i in range(len(series)-1)]
    # diffs = [3, 5, 7, 9, 11]
    next_diff = diffs[-1] + 2  # 11 + 2 = 13
    missing = series[-1] + next_diff  # 38 + 13 = 51
    # options: 1->49, 2->51, 3->54, 4->57
    option_map = {49: 1, 51: 2, 54: 3, 57: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
