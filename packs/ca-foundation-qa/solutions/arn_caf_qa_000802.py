def solve():
    from fractions import Fraction
    pA = Fraction(1, 3)
    pB = Fraction(1, 4)
    pC = Fraction(1, 5)
    qA = 1 - pA
    qB = 1 - pB
    qC = 1 - pC
    # Exactly one solves it
    result = pA * qB * qC + qA * pB * qC + qA * qB * pC
    # result = 12/60 + 8/60 + 6/60 = 26/60 = 13/30
    options = {1: Fraction(13, 30), 2: Fraction(3, 5), 3: Fraction(1, 2), 4: Fraction(1, 60)}
    option_key = [k for k, v in options.items() if v == result][0]
    return {"value": float(result), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
