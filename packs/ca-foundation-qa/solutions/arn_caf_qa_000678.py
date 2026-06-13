def solve():
    # Classes: 10-19, 20-29, 30-39, 40-49 (inclusive)
    # Gap between classes = 20 - 19 = 1; correction factor = 0.5
    lower_limit_20_29 = 20
    correction = 0.5
    lower_boundary = lower_limit_20_29 - correction
    # option 1: 19.5, option 2: 20.0, option 3: 20.5, option 4: 18.5
    options = {1: 19.5, 2: 20.0, 3: 20.5, 4: 18.5}
    correct = None
    for k, v in options.items():
        if abs(v - lower_boundary) < 0.001:
            correct = k
            break
    return {"value": lower_boundary, "option_key": correct}

if __name__ == "__main__":
    print(solve())
