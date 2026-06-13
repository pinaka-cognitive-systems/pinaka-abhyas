def solve():
    # Median class = class where cumulative frequency first reaches N/2
    classes = ["40-50", "50-60", "60-70", "70-80", "80-90"]
    frequencies = [8, 14, 20, 12, 6]
    N = sum(frequencies)
    half = N / 2  # 30
    cumulative = 0
    median_class = None
    for cls, f in zip(classes, frequencies):
        cumulative += f
        if cumulative >= half:
            median_class = cls
            break
    # option 1: 60-70, option 2: 50-60, option 3: 70-80, option 4: 40-50
    options = {1: "60-70", 2: "50-60", 3: "70-80", 4: "40-50"}
    correct = None
    for k, v in options.items():
        if v == median_class:
            correct = k
            break
    return {"value": median_class, "option_key": correct}

if __name__ == "__main__":
    print(solve())
