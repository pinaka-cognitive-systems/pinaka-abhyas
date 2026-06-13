def solve():
    data = [14, 22, 18, 26, 10, 30]
    data_sorted = sorted(data)
    n = len(data_sorted)
    # Median of even n
    median = (data_sorted[n//2 - 1] + data_sorted[n//2]) / 2
    md = sum(abs(x - median) for x in data_sorted) / n
    # median=20, md=6
    # Options: 1->6, 2->5.67, 3->20, 4->8
    options = {1: 6, 2: 5.67, 3: 20, 4: 8}
    correct = min(options, key=lambda k: abs(options[k] - md))
    return {"value": md, "option_key": correct}

if __name__ == "__main__":
    print(solve())
