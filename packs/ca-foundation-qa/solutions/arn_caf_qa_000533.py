def solve():
    # lim(x->4) (sqrt(x) - 2)/(x - 4)
    # Rationalise: multiply by (sqrt(x)+2)/(sqrt(x)+2)
    # = (x-4)/((x-4)(sqrt(x)+2)) = 1/(sqrt(x)+2)
    # At x=4: 1/(2+2) = 1/4
    import math

    def f(x):
        return (math.sqrt(x) - 2) / (x - 4)

    # Numerical verification
    left = f(3.9999)
    right = f(4.0001)

    assert abs(left - 0.25) < 0.001, f"Left limit: {left}"
    assert abs(right - 0.25) < 0.001, f"Right limit: {right}"

    # Analytical: 1/(sqrt(4)+2) = 1/4
    analytical = 1 / (math.sqrt(4) + 2)
    assert abs(analytical - 0.25) < 1e-9

    return {"value": 0.25, "option_key": 1}

if __name__ == "__main__":
    print(solve())
