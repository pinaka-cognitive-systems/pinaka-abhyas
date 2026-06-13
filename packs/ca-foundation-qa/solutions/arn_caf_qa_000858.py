def solve():
    from fractions import Fraction
    pairs = [(1, 1), (2, 2), (3, 4), (4, 6), (5, 3), (6, 5)]
    n = len(pairs)
    sum_d2 = sum((r1 - r2) ** 2 for r1, r2 in pairs)
    # sum_d2 = 10, n = 6
    # r_s = 1 - 60/210 = 150/210 = 5/7
    r_s = Fraction(1) - Fraction(6 * sum_d2, n * (n**2 - 1))
    # r_s = 5/7 -> option 1
    return {"value": float(r_s), "option_key": 1}

if __name__ == "__main__":
    print(solve())
