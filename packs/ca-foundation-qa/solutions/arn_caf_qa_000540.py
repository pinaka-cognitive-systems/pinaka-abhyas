def solve():
    # f(x) = (x^3 - 8)/(x^2 - 4) for x != 2, f(2) = c
    # For continuity at x=2: c = lim(x->2) (x^3-8)/(x^2-4)
    # x^3 - 8 = (x-2)(x^2+2x+4)  [difference of cubes]
    # x^2 - 4 = (x-2)(x+2)        [difference of squares]
    # Cancel (x-2): limit = (x^2+2x+4)/(x+2) as x->2
    # = (4+4+4)/(2+2) = 12/4 = 3
    numerator_factor = 2**2 + 2*2 + 4   # x^2+2x+4 at x=2 = 12
    denominator_factor = 2 + 2            # x+2 at x=2 = 4
    value = numerator_factor / denominator_factor   # = 3.0
    assert value == 3.0
    option_key = 2
    return {"value": int(value), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
