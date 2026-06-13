def solve():
    # P(X=0)=0.2, P(X=1)=0.5, P(X=2)=0.3
    values = [0, 1, 2]
    probs = [0.2, 0.5, 0.3]
    ex = sum(v * p for v, p in zip(values, probs))
    ex2 = sum(v**2 * p for v, p in zip(values, probs))
    var = ex2 - ex**2
    # var = 1.7 - 1.21 = 0.49
    # options: 1->0.60, 2->1.70, 3->0.69, 4->0.49
    options = {1: 0.60, 2: 1.70, 3: 0.69, 4: 0.49}
    opt_key = min(options, key=lambda k: abs(options[k] - var))
    return {"value": round(var, 4), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
