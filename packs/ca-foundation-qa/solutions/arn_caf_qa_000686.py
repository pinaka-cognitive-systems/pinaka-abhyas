def solve():
    # Less-than ogive: cumulative frequencies at upper class boundaries
    # Classes: 0-10, 10-20, 20-30, 30-40, 40-50
    # Frequencies: 5, 12, 18, 10, 5
    frequencies = [5, 12, 18, 10, 5]
    upper_boundaries = [10, 20, 30, 40, 50]

    # Cumulative frequency at upper boundary of class 20-30 (boundary = 30, index 2)
    cf_at_30 = sum(frequencies[0:3])  # 5 + 12 + 18 = 35

    # Options: 1->18, 2->30, 3->35, 4->17
    assert cf_at_30 == 35
    correct_option = 3
    return {"value": cf_at_30, "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
