def solve():
    data = [5, 10, 15, 20, 25]
    n = len(data)
    mean = sum(data) / n
    md = sum(abs(x - mean) for x in data) / n
    cmd = (md / mean) * 100
    # mean=15, md=6, cmd=40%
    # Options: 1->40%, 2->50%, 3->6%, 4->30%
    options = {1: 40, 2: 50, 3: 6, 4: 30}
    correct = min(options, key=lambda k: abs(options[k] - cmd))
    return {"value": cmd, "option_key": correct}

if __name__ == "__main__":
    print(solve())
