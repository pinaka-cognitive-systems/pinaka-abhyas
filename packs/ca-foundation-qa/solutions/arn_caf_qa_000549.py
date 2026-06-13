def solve():
    # Series: 144, 121, 100, 81, ?, 49
    # Rule: descending squares: 12^2, 11^2, 10^2, 9^2, 8^2, 7^2
    n = 8
    missing = n ** 2  # 8^2 = 64
    # options: 1->60, 2->62, 3->63, 4->64
    option_map = {60: 1, 62: 2, 63: 3, 64: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
