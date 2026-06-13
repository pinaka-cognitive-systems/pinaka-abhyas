def solve():
    a = 64
    r = 0.5
    n = 5
    S_n = a * (1 - r ** n) / (1 - r)   # 64 * (31/32) / 0.5 = 124
    S_n = int(round(S_n))
    # options: 1->124, 2->126, 3->128, 4->120
    options = {1: 124, 2: 126, 3: 128, 4: 120}
    option_key = [k for k, v in options.items() if v == S_n][0]
    return {"value": S_n, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
