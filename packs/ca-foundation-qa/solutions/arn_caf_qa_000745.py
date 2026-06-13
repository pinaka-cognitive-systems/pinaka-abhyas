def solve():
    data = [10, 20, 30, 40, 50]
    n = len(data)
    mean = sum(data) / n
    md = sum(abs(x - mean) for x in data) / n
    # mean=30, md=12
    # Options: 1->12, 2->10, 3->15, 4->30
    options = {1: 12, 2: 10, 3: 15, 4: 30}
    correct = min(options, key=lambda k: abs(options[k] - md))
    return {"value": md, "option_key": correct}

if __name__ == "__main__":
    print(solve())
