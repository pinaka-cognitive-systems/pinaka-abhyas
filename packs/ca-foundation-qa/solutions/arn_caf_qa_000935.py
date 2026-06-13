def solve():
    # Unequal-width histogram: the plotted heights are frequency DENSITIES
    # (frequency per unit class width). Actual frequency = density * width.
    classes = [(0, 10), (10, 30), (30, 40), (40, 70), (70, 80)]
    density = [2, 3, 5, 1, 4]   # heights read off the y-axis (per unit width)
    widths = [b - a for a, b in classes]
    freqs = [d * w for d, w in zip(density, widths)]
    total = sum(freqs)
    return {"value": int(total), "option_key": 4}


if __name__ == "__main__":
    print(solve())
