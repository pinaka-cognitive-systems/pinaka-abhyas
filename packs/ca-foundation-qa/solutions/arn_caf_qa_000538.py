def solve():
    # g(x) = 2x+3 for x<1, g(1)=7, g(x)=x^2+4 for x>1
    # LHL = 2(1)+3 = 5
    # RHL = 1^2+4 = 5
    # two-sided limit = 5, but g(1) = 7 != 5
    # Discontinuous: option 3
    lhl = 2 * 1 + 3
    rhl = 1**2 + 4
    g_at_1 = 7
    assert lhl == rhl, "one-sided limits must agree"
    assert lhl != g_at_1, "discontinuous"
    value = lhl  # = 5
    option_key = 3
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
