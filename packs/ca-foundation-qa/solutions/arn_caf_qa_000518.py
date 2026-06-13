def solve():
    nA = 70
    nB = 55
    nAB = 25
    a_not_b = nA - nAB  # 45
    assert a_not_b == 45
    return {"value": a_not_b, "option_key": 1}

if __name__ == "__main__":
    print(solve())
