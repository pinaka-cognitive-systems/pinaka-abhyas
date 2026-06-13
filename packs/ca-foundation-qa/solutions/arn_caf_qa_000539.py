def solve():
    # h(x) = (x^2 - 16)/(x - 4) for x != 4, h(4) = p
    # For continuity at x=4: p = lim(x->4) (x^2-16)/(x-4)
    # = lim(x->4) (x-4)(x+4)/(x-4) = lim(x->4) (x+4) = 4+4 = 8
    value = 4 + 4
    option_key = 2
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
