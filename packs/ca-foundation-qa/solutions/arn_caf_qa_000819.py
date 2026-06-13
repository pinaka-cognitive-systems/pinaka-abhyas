def solve():
    # Factory A: 60% of output, 2% defective
    # Factory B: 40% of output, 5% defective
    # Item found defective. P(from B | defective)?
    from fractions import Fraction
    p_A = Fraction(6, 10)
    p_B = Fraction(4, 10)
    p_D_given_A = Fraction(2, 100)
    p_D_given_B = Fraction(5, 100)
    p_D_and_A = p_D_given_A * p_A
    p_D_and_B = p_D_given_B * p_B
    p_D = p_D_and_A + p_D_and_B
    p_B_given_D = p_D_and_B / p_D
    # p_B_given_D = 0.020 / 0.032 = 5/8
    p_float = float(p_B_given_D)
    # options: 1->5/16, 2->1/2, 3->5/8, 4->2/7
    options = {
        1: float(Fraction(5, 16)),
        2: float(Fraction(1, 2)),
        3: float(Fraction(5, 8)),
        4: float(Fraction(2, 7))
    }
    opt_key = min(options, key=lambda k: abs(options[k] - p_float))
    return {"value": p_float, "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
