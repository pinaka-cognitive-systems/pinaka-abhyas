def solve():
    # integral of (3x^2 - 4x + 1) from x=2 to x=5
    # antiderivative: F(x) = x^3 - 2x^2 + x
    antideriv = lambda x: x**3 - 2*x**2 + x
    value = antideriv(5) - antideriv(2)
    # Options: 1->78, 2->36, 3->80, 4->82
    option_map = {78: 1, 36: 2, 80: 3, 82: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
