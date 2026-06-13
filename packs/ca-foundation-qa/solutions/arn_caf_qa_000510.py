def solve():
    # C(x) = x^3 - 9x^2 + 30x + 5
    # MC = dC/dx = 3x^2 - 18x + 30
    # d(MC)/dx = 6x - 18 = 0 => x = 3
    # d^2(MC)/dx^2 = 6 > 0 => minimum at x = 3
    MC = lambda x: 3*x**2 - 18*x + 30
    x_min = 3
    value = MC(x_min)  # = 3
    # Verify it is a minimum: MC(2) = 12-36+30 = 6 > 3, MC(4) = 48-72+30 = 6 > 3
    assert MC(2) > value and MC(4) > value, "Not a minimum"
    # Options: 1->3, 2->0, 3->6, 4->30
    option_map = {3: 1, 0: 2, 6: 3, 30: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
