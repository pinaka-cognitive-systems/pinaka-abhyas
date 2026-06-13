def solve():
    # (9^(3/2) * 27^(-1)) / 3^2
    # = 3^3 * 3^(-3) / 3^2 = 3^0 / 3^2 = 1/9
    from fractions import Fraction
    numerator = Fraction(9) ** Fraction(3, 2) * Fraction(27) ** (-1)
    denominator = Fraction(3) ** 2
    result = numerator / denominator
    # result = 1/9, represented as option_key 1
    return {"value": float(result), "option_key": 1}

if __name__ == "__main__":
    print(solve())
