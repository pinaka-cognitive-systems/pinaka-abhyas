def solve():
    # Series: 1, 4, 9, 16, ?, 36
    # Rule: n^2 for n = 1, 2, 3, 4, 5, 6
    n = 5
    missing = n ** 2  # 5^2 = 25
    # options: 1->20, 2->22, 3->25, 4->28
    option_map = {20: 1, 22: 2, 25: 3, 28: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
