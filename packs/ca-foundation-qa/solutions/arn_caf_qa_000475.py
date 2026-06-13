def solve():
    a = 7
    d = 5
    n = 12
    T_n = a + (n - 1) * d  # 7 + 11*5 = 62
    # options: 1->57, 2->62, 3->52, 4->67
    options = {1: 57, 2: 62, 3: 52, 4: 67}
    option_key = [k for k, v in options.items() if v == T_n][0]
    return {"value": T_n, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
