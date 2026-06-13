def solve():
    # Series: 2, 6, 12, 20, 30, ?, 56
    # Rule: n*(n+1) for n = 1, 2, 3, 4, 5, 6, 7
    n = 6
    missing = n * (n + 1)  # 6 * 7 = 42
    # options: 1->36, 2->40, 3->42, 4->46
    option_map = {36: 1, 40: 2, 42: 3, 46: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
