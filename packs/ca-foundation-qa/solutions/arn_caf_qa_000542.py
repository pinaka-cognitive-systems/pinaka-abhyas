def solve():
    # Series: 4, 9, 14, 19, 24, ?
    # Rule: AP with first term 4, common difference 5
    series = [4, 9, 14, 19, 24]
    common_diff = 5
    next_term = series[-1] + common_diff  # 24 + 5 = 29
    # options: 1->27, 2->28, 3->29, 4->30
    option_map = {27: 1, 28: 2, 29: 3, 30: 4}
    return {"value": next_term, "option_key": option_map[next_term]}

if __name__ == "__main__":
    print(solve())
