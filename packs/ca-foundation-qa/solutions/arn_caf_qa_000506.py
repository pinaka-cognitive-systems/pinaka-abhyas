def solve():
    # C(x) = x^3 - 3x^2 + 7x + 100
    # MC = dC/dx = 3x^2 - 6x + 7
    x = 4
    mc = 3*x**2 - 6*x + 7
    # Options: 1->31, 2->36, 3->15, 4->144
    option_map = {31: 1, 36: 2, 15: 3, 144: 4}
    return {"value": mc, "option_key": option_map[mc]}

if __name__ == "__main__":
    print(solve())
