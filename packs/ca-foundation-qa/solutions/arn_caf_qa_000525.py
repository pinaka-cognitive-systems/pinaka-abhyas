def solve():
    # f(x) = x^2 - 4, f: R -> R
    def f(x):
        return x * x - 4

    # Check one-one: f(2) == f(-2)?
    one_one_fail = (f(2) == f(-2) and 2 != -2)
    assert one_one_fail, "Should NOT be one-one"

    # Check onto: minimum of f is -4 (at x=0), values below -4 have no pre-image
    # Try y = -5: need x^2 = -1, impossible
    import math
    y_test = -5
    discriminant = y_test + 4  # x^2 = y+4
    onto_fail = (discriminant < 0)
    assert onto_fail, "Should NOT be onto"

    # Neither one-one nor onto -> option 4
    return {"value": 4, "option_key": 4}

if __name__ == "__main__":
    print(solve())
