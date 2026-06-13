def solve():
    # Modal class = class with highest frequency
    classes = ["100-150", "150-200", "200-250", "250-300", "300-350"]
    frequencies = [4, 9, 14, 8, 5]
    max_freq = max(frequencies)
    modal_class = classes[frequencies.index(max_freq)]
    # option 1: 200-250, option 2: 150-200, option 3: 250-300, option 4: 100-150
    options = {1: "200-250", 2: "150-200", 3: "250-300", 4: "100-150"}
    correct = None
    for k, v in options.items():
        if v == modal_class:
            correct = k
            break
    return {"value": modal_class, "option_key": correct}

if __name__ == "__main__":
    print(solve())
