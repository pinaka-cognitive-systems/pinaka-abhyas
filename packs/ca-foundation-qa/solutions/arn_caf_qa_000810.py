def solve():
    from fractions import Fraction
    pmf = {0: Fraction(1, 6), 1: Fraction(1, 3), 2: Fraction(1, 3), 3: Fraction(1, 6)}
    # E[X]
    ex = sum(k * pmf[k] for k in pmf)  # 3/2
    # E[3X + 5] = 3*E[X] + 5
    result = 3 * ex + 5  # 19/2 = 9.5
    options = {1: Fraction(19, 2), 2: Fraction(9, 2), 3: Fraction(9, 1), 4: Fraction(8, 1)}
    option_key = [k for k, v in options.items() if v == result][0]
    return {"value": float(result), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
