def solve():
    a = 3
    r = 2
    n = 8
    T_n = a * r ** (n - 1)   # 3 * 128 = 384
    # options: 1->192, 2->768, 3->384, 4->256
    options = {1: 192, 2: 768, 3: 384, 4: 256}
    option_key = [k for k, v in options.items() if v == T_n][0]
    return {"value": T_n, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
