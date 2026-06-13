def solve():
    # P(Head on coin) = 1/2, P(4 on die) = 1/6
    # Independent events: multiply
    from fractions import Fraction
    p_head = Fraction(1, 2)
    p_four = Fraction(1, 6)
    result = p_head * p_four  # 1/12
    # Options: 1->1/12, 2->1/6, 3->1/3, 4->7/12
    options = {1: Fraction(1, 12), 2: Fraction(1, 6), 3: Fraction(1, 3), 4: Fraction(7, 12)}
    option_key = [k for k, v in options.items() if v == result][0]
    return {"value": float(result), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
