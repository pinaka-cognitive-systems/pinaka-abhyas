def solve():
    # integral of (3x^2 - 12) from x=2 to x=4
    # antiderivative: F(x) = x^3 - 12x
    antideriv = lambda x: x**3 - 12*x
    value = antideriv(4) - antideriv(2)
    # Options: 1->32, 2->36, 3->16, 4->0
    option_map = {32: 1, 36: 2, 16: 3, 0: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
