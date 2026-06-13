def solve():
    # lim(x->2) (x^2 - 4)/(x - 2)
    # Factor: (x+2)(x-2)/(x-2) = x+2 (for x != 2)
    # lim(x->2)(x+2) = 4

    # Numerical verification
    def f(x):
        return (x * x - 4) / (x - 2)

    # Approach from both sides
    left = f(1.9999)
    right = f(2.0001)

    assert abs(left - 4) < 0.01, f"Left limit: {left}"
    assert abs(right - 4) < 0.01, f"Right limit: {right}"

    return {"value": 4, "option_key": 2}

if __name__ == "__main__":
    print(solve())
