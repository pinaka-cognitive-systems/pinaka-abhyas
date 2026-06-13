def solve():
    mids = [15, 25, 35, 45, 55]
    freqs = [2, 8, 10, 8, 2]
    n = sum(freqs)
    mean = sum(m * f for m, f in zip(mids, freqs)) / n
    fdev = sum(abs(m - mean) * f for m, f in zip(mids, freqs))
    md = fdev / n
    # mean=35, md=8
    # Options: 1->8, 2->8.28, 3->12, 4->10
    options = {1: 8, 2: 8.28, 3: 12, 4: 10}
    correct = min(options, key=lambda k: abs(options[k] - md))
    return {"value": md, "option_key": correct}

if __name__ == "__main__":
    print(solve())
