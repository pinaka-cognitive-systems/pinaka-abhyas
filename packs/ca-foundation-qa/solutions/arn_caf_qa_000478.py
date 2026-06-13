def solve():
    T5 = 17
    T13 = 41
    # d = (T13 - T5) / (13 - 5)
    d = (T13 - T5) / (13 - 5)  # 24/8 = 3
    a = T5 - 4 * d               # 17 - 12 = 5
    n = 25
    S_n = n / 2 * (2 * a + (n - 1) * d)  # 25/2 * 82 = 1025
    S_n = int(S_n)
    # options: 1->1025, 2->1225, 3->1175, 4->1100
    options = {1: 1025, 2: 1225, 3: 1175, 4: 1100}
    option_key = [k for k, v in options.items() if v == S_n][0]
    return {"value": S_n, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
