def solve():
    # Bag: 4 red, 6 blue, total 10. With replacement.
    # P(second red | first was red) = 4/10 (independence since replaced)
    from fractions import Fraction
    p = Fraction(4, 10)
    p_float = float(p)
    # options: 1->4/10=0.4, 2->3/9=1/3, 3->16/100=0.16, 4->4/9
    options = {
        1: float(Fraction(4, 10)),
        2: float(Fraction(3, 9)),
        3: float(Fraction(16, 100)),
        4: float(Fraction(4, 9))
    }
    opt_key = min(options, key=lambda k: abs(options[k] - p_float))
    return {"value": p_float, "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
