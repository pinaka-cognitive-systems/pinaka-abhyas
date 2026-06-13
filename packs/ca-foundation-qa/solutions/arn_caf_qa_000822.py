def solve():
    from fractions import Fraction
    # Supplier proportions
    p_X = Fraction(1, 2)
    p_Y = Fraction(3, 10)
    p_Z = Fraction(1, 5)
    # Defect rates
    d_X = Fraction(1, 100)
    d_Y = Fraction(2, 100)
    d_Z = Fraction(3, 100)
    # P(D) = marginal defect probability
    p_D = p_X * d_X + p_Y * d_Y + p_Z * d_Z
    assert p_D == Fraction(17, 1000), f"P(D) should be 17/1000 but got {p_D}"
    # Single-draw posterior: P(Z|D)
    p_Z_given_D = (d_Z * p_Z) / p_D
    assert p_Z_given_D == Fraction(6, 17), f"P(Z|D) should be 6/17 but got {p_Z_given_D}"
    # Two independent draws: P(both Z | both defective) = P(Z|D)^2
    p_both_Z = p_Z_given_D ** 2
    assert p_both_Z == Fraction(36, 289), f"Expected 36/289 but got {p_both_Z}"
    p_float = float(p_both_Z)
    # options: 1->6/17, 2->36/289, 3->6/289, 4->1/5
    options = {
        1: float(Fraction(6, 17)),
        2: float(Fraction(36, 289)),
        3: float(Fraction(6, 289)),
        4: float(Fraction(1, 5))
    }
    opt_key = min(options, key=lambda k: abs(options[k] - p_float))
    return {"value": round(p_float, 6), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
