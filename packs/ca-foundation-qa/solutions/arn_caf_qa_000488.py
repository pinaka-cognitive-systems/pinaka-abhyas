def solve():
    # T3 = a*r^2 = 18, T6 = a*r^5 = 486
    t3 = 18
    t6 = 486
    r3 = t6 / t3  # r^3
    r = round(r3 ** (1/3))
    assert r ** 3 == r3
    a = t3 / (r ** 2)
    assert a == 2
    return {"value": int(a), "option_key": 1}

if __name__ == "__main__":
    print(solve())
