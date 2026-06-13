def solve():
    # C(x) = 2x^2 + 5x + 100
    # MC = dC/dx = 4x + 5
    x = 10
    mc = 4 * x + 5
    assert mc == 45
    return {"value": mc, "option_key": 1}

if __name__ == "__main__":
    print(solve())
