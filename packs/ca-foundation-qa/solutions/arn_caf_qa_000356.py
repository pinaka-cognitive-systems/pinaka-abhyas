def solve():
    # 4000 + 20n >= 10000 => 20n >= 6000 => n >= 300
    import math
    fixed = 4000
    target = 10000
    rate = 20
    n_min = math.ceil((target - fixed) / rate)
    # verify
    assert fixed + rate * n_min >= target
    assert fixed + rate * (n_min - 1) < target
    # option mapping: 1->280, 2->300, 3->320, 4->350
    options = {1: 280, 2: 300, 3: 320, 4: 350}
    for k, v in options.items():
        if v == n_min:
            return {"value": n_min, "option_key": k}

if __name__ == "__main__":
    print(solve())
