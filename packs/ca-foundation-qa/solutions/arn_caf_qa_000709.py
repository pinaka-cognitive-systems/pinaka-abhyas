def solve():
    data = [15, 22, 8, 31, 18, 27, 11]
    data_sorted = sorted(data)
    n = len(data_sorted)
    median_pos = (n + 1) // 2 - 1  # 0-indexed
    median = data_sorted[median_pos]
    # options: 1->18, 2->22, 3->19, 4->15
    option_map = {18: 1, 22: 2, 19: 3, 15: 4}
    return {"value": median, "option_key": option_map[median]}

if __name__ == "__main__":
    print(solve())
