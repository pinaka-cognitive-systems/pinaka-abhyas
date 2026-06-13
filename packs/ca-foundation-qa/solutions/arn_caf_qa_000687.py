def solve():
    # Histogram with equal class widths: bar height = frequency
    # Find the class with maximum frequency
    classes = ["0-10", "10-20", "20-30", "30-40", "40-50"]
    frequencies = [8, 14, 22, 10, 6]

    max_freq = max(frequencies)
    max_idx = frequencies.index(max_freq)
    tallest_class = classes[max_idx]

    assert max_freq == 22
    assert tallest_class == "20-30"
    # Option 2: 20-30 with height 22
    correct_option = 2
    return {"value": max_freq, "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
