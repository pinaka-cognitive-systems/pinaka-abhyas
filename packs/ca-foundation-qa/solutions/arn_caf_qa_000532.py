def solve():
    # lim(x->3) (x^2 - 5x + 6)/(x - 3)
    # Factor: (x-2)(x-3)/(x-3) = x-2 (for x != 3)
    # lim(x->3)(x-2) = 1

    def f(x):
        return (x * x - 5 * x + 6) / (x - 3)

    # Numerical verification
    left = f(2.9999)
    right = f(3.0001)

    assert abs(left - 1) < 0.01, f"Left limit: {left}"
    assert abs(right - 1) < 0.01, f"Right limit: {right}"

    return {"value": 1, "option_key": 1}

if __name__ == "__main__":
    print(solve())
