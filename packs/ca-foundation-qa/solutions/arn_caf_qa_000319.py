def solve():
    # Compound ratio of 3:4 and 5:6 = 15:24 = 5:8
    # x:y = 5:8 and x + y = 26
    # sum of parts = 13; t = 26/13 = 2; x = 5*2 = 10
    from math import gcd
    r1_n, r1_d = 3, 4
    r2_n, r2_d = 5, 6
    comp_n = r1_n * r2_n  # 15
    comp_d = r1_d * r2_d  # 24
    g = gcd(comp_n, comp_d)
    comp_n //= g  # 5
    comp_d //= g  # 8
    total = 26
    t = total // (comp_n + comp_d)  # 26 // 13 = 2
    x = comp_n * t  # 10
    return {"value": x, "option_key": 3}

if __name__ == "__main__":
    print(solve())
