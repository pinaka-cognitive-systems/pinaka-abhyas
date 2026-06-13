def solve():
    # Series: 3, 6, 12, 24, ?, 96
    # Rule: each term doubles the previous (geometric, ratio=2)
    series = [3, 6, 12, 24]
    ratio = 2
    missing = series[-1] * ratio  # 24 * 2 = 48
    # options: 1->36, 2->42, 3->48, 4->54
    option_map = {36: 1, 42: 2, 48: 3, 54: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
