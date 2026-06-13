def solve():
    T3 = 36
    T6 = 972
    # r^3 = T6 / T3
    r_cubed = T6 / T3   # 27
    r = round(r_cubed ** (1 / 3))  # 3
    # a = T3 / r^2
    a = T3 / r ** 2   # 36 / 9 = 4
    a = int(a)
    # options: 1->4, 2->12, 3->2, 4->6
    options = {1: 4, 2: 12, 3: 2, 4: 6}
    option_key = [k for k, v in options.items() if v == a][0]
    return {"value": a, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
