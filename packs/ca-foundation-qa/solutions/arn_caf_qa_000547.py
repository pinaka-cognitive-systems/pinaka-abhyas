def solve():
    # Series: 1, 8, 27, 64, ?, 216
    # Rule: n^3 for n = 1, 2, 3, 4, 5, 6
    n = 5
    missing = n ** 3  # 5^3 = 125
    # options: 1->100, 2->121, 3->125, 4->144
    option_map = {100: 1, 121: 2, 125: 3, 144: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
