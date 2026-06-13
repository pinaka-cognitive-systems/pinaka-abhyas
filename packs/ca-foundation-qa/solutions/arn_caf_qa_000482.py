def solve():
    a = 12
    r = 1 / 3
    assert abs(r) < 1, "Convergence condition not met"
    S_inf = a / (1 - r)   # 12 / (2/3) = 18
    S_inf = round(S_inf)  # 18
    # options: 1->9, 2->36, 3->18, 4->6
    options = {1: 9, 2: 36, 3: 18, 4: 6}
    option_key = [k for k, v in options.items() if v == S_inf][0]
    return {"value": S_inf, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
