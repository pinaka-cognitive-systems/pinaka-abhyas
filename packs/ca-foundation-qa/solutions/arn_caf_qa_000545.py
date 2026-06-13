def solve():
    # Series: 5, 10, 20, ?, 80, 160
    # Rule: GP with ratio 2
    series_before = [5, 10, 20]
    ratio = 2
    missing = series_before[-1] * ratio  # 20 * 2 = 40
    # options: 1->35, 2->40, 3->45, 4->50
    option_map = {35: 1, 40: 2, 45: 3, 50: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
