def solve():
    # Urn I: 3 red, 2 white (total 5). Urn II: 1 red, 4 white (total 5).
    # Fair coin: P(Urn I) = P(Urn II) = 1/2
    from fractions import Fraction
    p_I = Fraction(1, 2)
    p_II = Fraction(1, 2)
    p_R_given_I = Fraction(3, 5)
    p_R_given_II = Fraction(1, 5)
    p_R_and_I = p_R_given_I * p_I
    p_R_and_II = p_R_given_II * p_II
    p_R = p_R_and_I + p_R_and_II
    p_I_given_R = p_R_and_I / p_R
    # = (3/10) / (4/10) = 3/4
    p_float = float(p_I_given_R)
    # options: 1->3/4=0.75, 2->3/8=0.375, 3->2/3, 4->1/2
    options = {
        1: float(Fraction(3, 4)),
        2: float(Fraction(3, 8)),
        3: float(Fraction(2, 3)),
        4: float(Fraction(1, 2))
    }
    opt_key = min(options, key=lambda k: abs(options[k] - p_float))
    return {"value": p_float, "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
