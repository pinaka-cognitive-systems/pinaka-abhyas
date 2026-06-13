def solve():
    # Intersection of less-than and more-than ogive at (47, 60)
    # Median = x-coordinate of intersection
    intersection_x = 47
    intersection_y = 60  # = N/2 = 120/2
    median = intersection_x
    # option 1: 47, option 2: 60, option 3: 120, option 4: 23.5
    options = {1: 47, 2: 60, 3: 120, 4: 23.5}
    correct = None
    for k, v in options.items():
        if abs(v - median) < 0.01:
            correct = k
            break
    return {"value": median, "option_key": correct}

if __name__ == "__main__":
    print(solve())
