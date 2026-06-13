def solve():
    # Class width = upper limit - lower limit
    # For class 10-20: width = 20 - 10 = 10
    class_width = 20 - 10
    # option 1: 10, option 2: 5, option 3: 15, option 4: 20
    options = {1: 10, 2: 5, 3: 15, 4: 20}
    correct = None
    for k, v in options.items():
        if v == class_width:
            correct = k
            break
    return {"value": class_width, "option_key": correct}

if __name__ == "__main__":
    print(solve())
