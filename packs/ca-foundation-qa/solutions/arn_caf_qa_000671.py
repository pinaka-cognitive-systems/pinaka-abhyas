def solve():
    # Cumulative frequencies for classes [0-10],[10-20],[20-30],[30-40],[40-50]
    cum_freqs = [6, 16, 30, 38, 40]
    class_boundaries = [(0, 10), (10, 20), (20, 30), (30, 40), (40, 50)]
    N = 40
    median_position = N / 2  # 20
    # Find the first class where cumulative frequency >= median_position
    median_class_index = None
    for i, cf in enumerate(cum_freqs):
        if cf >= median_position:
            median_class_index = i
            break
    # median_class_index = 2 -> class [20-30] -> option 1
    return {"value": class_boundaries[median_class_index][0], "option_key": 1}

if __name__ == "__main__":
    print(solve())
