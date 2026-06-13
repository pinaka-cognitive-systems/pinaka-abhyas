def solve():
    from fractions import Fraction
    p = Fraction(3, 8)
    q = 1 - p  # 5/8
    variance = p * q  # 15/64
    options = {1: Fraction(15, 64), 2: Fraction(9, 64), 3: Fraction(3, 8), 4: Fraction(25, 64)}
    option_key = [k for k, v in options.items() if v == variance][0]
    return {"value": float(variance), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
