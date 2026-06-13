def solve():
    a = 2
    n = 20
    S_n = 610
    # S_n = n/2 * (2a + (n-1)*d)
    # 610 = 10 * (4 + 19d)
    # 61 = 4 + 19d
    # 19d = 57
    d = (2 * S_n / n - 2 * a) / (n - 1)  # = (61 - 4) / 19 = 57/19 = 3
    # options: 1->2, 2->3, 3->4, 4->5
    options = {1: 2, 2: 3, 3: 4, 4: 5}
    option_key = [k for k, v in options.items() if abs(v - d) < 1e-9][0]
    return {"value": d, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
