def solve():
    # f(x) = x^2 - 6x + 11 = (x-3)^2 + 2 on domain [0, 5]
    def f(x):
        return x * x - 6 * x + 11

    # Evaluate at vertex and endpoints
    val0 = f(0)   # 11
    val3 = f(3)   # 2 (vertex, minimum)
    val5 = f(5)   # 6

    assert val0 == 11
    assert val3 == 2
    assert val5 == 6

    range_min = min(val0, val3, val5)
    range_max = max(val0, val3, val5)
    assert range_min == 2
    assert range_max == 11

    # Range = [2, 11] -> option 1
    return {"value": 1, "option_key": 1}

if __name__ == "__main__":
    print(solve())
