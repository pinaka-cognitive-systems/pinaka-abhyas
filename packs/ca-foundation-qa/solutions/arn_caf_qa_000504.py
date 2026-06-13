def solve():
    # integral of (x+2)^2 from x=1 to x=4
    # expand: x^2 + 4x + 4
    # antiderivative: F(x) = x^3/3 + 2x^2 + 4x
    from fractions import Fraction
    F = lambda x: Fraction(x**3, 3) + 2*x**2 + 4*x
    value = int(F(4) - F(1))  # = 63
    # Options: 1->63, 2->105, 3->135, 4->189
    option_map = {63: 1, 105: 2, 135: 3, 189: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
