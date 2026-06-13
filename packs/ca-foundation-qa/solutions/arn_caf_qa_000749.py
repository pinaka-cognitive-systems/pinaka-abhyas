def solve():
    # Classes: 100-200, 200-300, 300-400, 400-500
    lower = [100, 200, 300, 400]
    mids = [150, 250, 350, 450]
    freqs = [5, 10, 20, 15]
    h = 100
    n = sum(freqs)

    # Cumulative frequencies
    cf = []
    cumulative = 0
    for f in freqs:
        cumulative += f
        cf.append(cumulative)

    # Find median class (n/2 = 25)
    half_n = n / 2
    median_class = None
    prev_cf = 0
    for i, c in enumerate(cf):
        if c >= half_n:
            median_class = i
            prev_cf = cf[i - 1] if i > 0 else 0
            break

    median = lower[median_class] + ((half_n - prev_cf) / freqs[median_class]) * h
    # median = 350

    fdev = sum(abs(mids[i] - median) * freqs[i] for i in range(len(mids)))
    md = fdev / n
    # md = 70

    # Options: 1->70, 2->74, 3->90, 4->71.43
    options = {1: 70, 2: 74, 3: 90, 4: 71.43}
    correct = min(options, key=lambda k: abs(options[k] - md))
    return {"value": md, "option_key": correct}

if __name__ == "__main__":
    print(solve())
