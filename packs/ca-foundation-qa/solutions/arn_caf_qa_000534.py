def solve():
    # lim(x->infinity) (3x^2 - 2x + 1)/(5x^2 + x - 4)
    # Both degree 2; ratio of leading coefficients = 3/5

    def f(x):
        return (3 * x * x - 2 * x + 1) / (5 * x * x + x - 4)

    # Numerical verification at large x
    vals = [f(1000), f(10000), f(1000000)]
    for v in vals:
        assert abs(v - 3 / 5) < 0.001, f"Value: {v}"

    return {"value": 3 / 5, "option_key": 1}

if __name__ == "__main__":
    print(solve())
