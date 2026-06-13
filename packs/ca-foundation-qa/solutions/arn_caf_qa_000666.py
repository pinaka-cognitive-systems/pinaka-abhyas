def solve():
    # Classes: [10-20], [20-30], [30-40], [40-50]; class width = 10
    # First class midpoint = 15, last class midpoint = 45
    # Imaginary class before: [0-10], midpoint = 5
    # Imaginary class after: [50-60], midpoint = 55
    class_width = 10
    first_midpoint = 15
    last_midpoint = 45
    left_close = first_midpoint - class_width   # 5
    right_close = last_midpoint + class_width   # 55
    # Corresponds to option 1: "5 and 55"
    return {"value": left_close, "option_key": 1}

if __name__ == "__main__":
    print(solve())
