def solve():
    # Series: 3, 10, 29, 66, 127, ?
    # Rule: T(n) = n^3 + 2 for n = 1, 2, 3, 4, 5, 6
    # Verify:
    series = [3, 10, 29, 66, 127]
    for i, t in enumerate(series, start=1):
        assert t == i**3 + 2, f"Failed at n={i}: expected {i**3 + 2}, got {t}"

    n = 6
    missing = n**3 + 2  # 216 + 2 = 218

    # options: 1->210, 2->214, 3->216, 4->218
    option_map = {210: 1, 214: 2, 216: 3, 218: 4}
    return {"value": missing, "option_key": option_map[missing]}

if __name__ == "__main__":
    print(solve())
