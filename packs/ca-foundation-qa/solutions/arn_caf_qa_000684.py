def solve():
    # Histogram with unequal class widths: bar height = frequency density = f / class_width
    classes = ["0-10", "10-20", "20-40", "40-50", "50-80"]
    lower_limits = [0, 10, 20, 40, 50]
    upper_limits = [10, 20, 40, 50, 80]
    frequencies = [12, 18, 30, 16, 24]

    densities = []
    for f, lo, hi in zip(frequencies, lower_limits, upper_limits):
        width = hi - lo
        density = f / width
        densities.append(density)

    # Find class with maximum frequency density
    max_density = max(densities)
    max_class = classes[densities.index(max_density)]

    # Verify: densities should be 1.2, 1.8, 1.5, 1.6, 0.8
    assert abs(densities[0] - 1.2) < 0.001, f"Expected 1.2, got {densities[0]}"
    assert abs(densities[1] - 1.8) < 0.001, f"Expected 1.8, got {densities[1]}"
    assert abs(densities[2] - 1.5) < 0.001, f"Expected 1.5, got {densities[2]}"
    assert abs(densities[3] - 1.6) < 0.001, f"Expected 1.6, got {densities[3]}"
    assert abs(densities[4] - 0.8) < 0.001, f"Expected 0.8, got {densities[4]}"

    # option 1: "10-20", option 2: "20-40", option 3: "50-80", option 4: "0-10"
    options = {1: "10-20", 2: "20-40", 3: "50-80", 4: "0-10"}
    correct = None
    for k, v in options.items():
        if v == max_class:
            correct = k
            break
    return {"value": max_density, "option_key": correct}

if __name__ == "__main__":
    print(solve())
