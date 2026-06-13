def solve():
    # f(x) = (x^2 - 4)/(x - 2) for x != 2, f(2) = k
    # For continuity at x=2: k = lim(x->2) (x^2-4)/(x-2)
    # = lim(x->2) (x-2)(x+2)/(x-2) = lim(x->2) (x+2) = 2+2 = 4
    value = 2 + 2
    option_key = 2
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
