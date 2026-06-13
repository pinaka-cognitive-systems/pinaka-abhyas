def solve():
    data = [34, 28, 45, 22, 38, 31]
    data_sorted = sorted(data)
    n = len(data_sorted)
    # n=6 even, median = average of 3rd and 4th (1-indexed)
    median = (data_sorted[n // 2 - 1] + data_sorted[n // 2]) / 2
    # options: 1->34, 2->32.5, 3->33, 4->38
    option_map = {34.0: 1, 32.5: 2, 33.0: 3, 38.0: 4}
    return {"value": median, "option_key": option_map[median]}

if __name__ == "__main__":
    print(solve())
