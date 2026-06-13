def solve():
    # X takes values 1,2,3,4 with probabilities 0.1,0.3,0.4,0.2
    values = [1, 2, 3, 4]
    probs = [0.1, 0.3, 0.4, 0.2]
    ex = sum(v * p for v, p in zip(values, probs))
    # ex = 0.1 + 0.6 + 1.2 + 0.8 = 2.7
    # options: 1->2.5, 2->2.7, 3->3.0, 4->2.0
    options = {1: 2.5, 2: 2.7, 3: 3.0, 4: 2.0}
    opt_key = min(options, key=lambda k: abs(options[k] - ex))
    return {"value": round(ex, 4), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
