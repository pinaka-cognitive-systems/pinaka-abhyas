def solve():
    vals = [10, 15, 18, 22, 25]
    n = len(vals)
    mean = sum(vals) / n
    md = sum(abs(v - mean) for v in vals) / n
    # options: 1->4.0, 2->4.4, 3->5.0, 4->5.6
    options = {1: 4.0, 2: 4.4, 3: 5.0, 4: 5.6}
    option_key = [k for k, v in options.items() if abs(v - md) < 0.01][0]
    return {"value": md, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
