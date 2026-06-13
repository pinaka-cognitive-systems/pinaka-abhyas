def solve():
    from math import comb
    from fractions import Fraction
    n, k = 4, 2
    p = Fraction(1, 3)
    q = Fraction(2, 3)
    prob = comb(n, k) * p**k * q**(n-k)
    # prob = 6 * (1/9) * (4/9) = 24/81
    opts = {1: Fraction(4, 81), 2: Fraction(6, 81), 3: Fraction(24, 81), 4: Fraction(32, 81)}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": float(prob), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
