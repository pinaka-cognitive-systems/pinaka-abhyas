def solve():
    T1 = 2
    T5 = 162
    # 5-term GP: T5 = T1 * r^4
    # r^4 = T5 / T1 = 81
    r = (T5 / T1) ** (1 / 4)   # 81^0.25 = 3
    r = round(r)                # 3
    # The second inserted geometric mean is the 3rd term of the GP (T_3 = T1 * r^2)
    G2 = int(T1 * r ** 2)      # 2 * 9 = 18
    # options: 1->6, 2->18, 3->54, 4->27
    options = {1: 6, 2: 18, 3: 54, 4: 27}
    option_key = [k for k, v in options.items() if v == G2][0]
    return {"value": G2, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
