def solve():
    # Two cards drawn without replacement from 52-card deck
    # X = number of kings drawn
    # E(X) by linearity = 2 * (4/52) = 2/13
    from fractions import Fraction
    ex = 2 * Fraction(4, 52)
    # ex = Fraction(2, 13)
    ex_float = float(ex)
    # options as fractions: 1->2/13, 2->1/13, 3->4/51, 4->8/663
    options = {
        1: float(Fraction(2, 13)),
        2: float(Fraction(1, 13)),
        3: float(Fraction(4, 51)),
        4: float(Fraction(8, 663))
    }
    opt_key = min(options, key=lambda k: abs(options[k] - ex_float))
    return {"value": ex_float, "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
