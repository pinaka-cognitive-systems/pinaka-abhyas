def solve():
    a = 18000
    d = 1200
    target = 27000
    # T_n = a + (n-1)*d >= target
    # (n-1) >= (target - a) / d = 9000/1200 = 7.5
    # n >= 8.5, first integer n = 9
    import math
    n_minus_1 = (target - a) / d  # 7.5
    n = math.ceil(n_minus_1) + 1  # ceil(7.5)=8, n=9
    # verify
    T_n = a + (n - 1) * d
    assert T_n >= target
    assert a + (n - 2) * d < target
    # options: 1->"8th year" (n=8), 2->"9th year" (n=9), 3->"7th year" (n=7), 4->"10th year" (n=10)
    year_map = {1: 8, 2: 9, 3: 7, 4: 10}
    option_key = [k for k, v in year_map.items() if v == n][0]
    return {"value": n, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
