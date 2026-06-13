def solve():
    P_total = 20000
    I_total = 6900
    # 0.36x + 0.30*(20000-x) = 6900
    # 0.06x = 6900 - 6000 = 900
    x = 900 / 0.06  # 15000
    # verify
    SI1 = x * 9 * 4 / 100
    SI2 = (P_total - x) * 6 * 5 / 100
    assert abs(SI1 + SI2 - I_total) < 0.01, f"Check failed: {SI1+SI2} != {I_total}"
    return {"value": x, "option_key": 1}

if __name__ == "__main__":
    print(solve())
