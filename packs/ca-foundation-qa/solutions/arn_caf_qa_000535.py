def solve():
    # lim(x->3) (x^2 - 9)/(x - 3)
    # Factor: (x-3)(x+3)/(x-3) = x+3
    # At x=3: 3+3 = 6
    value = 3 + 3
    option_key = 2
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
