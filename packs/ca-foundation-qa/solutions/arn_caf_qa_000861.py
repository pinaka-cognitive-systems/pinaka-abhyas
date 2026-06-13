def solve():
    b_yx = 2.0
    x_bar = 10.0
    y_bar = 15.0
    a = y_bar - b_yx * x_bar
    # a = -5, line: Y = -5 + 2X -> option 1
    return {"value": a, "option_key": 1}

if __name__ == "__main__":
    print(solve())
