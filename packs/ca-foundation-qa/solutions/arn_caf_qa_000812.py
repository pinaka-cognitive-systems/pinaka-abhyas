def solve():
    # Win 50 with p=0.4, win 20 with p=0.3, lose 30 with p=0.3
    outcomes = [50, 20, -30]
    probs = [0.4, 0.3, 0.3]
    ex = sum(x * p for x, p in zip(outcomes, probs))
    # ex = 20 + 6 - 9 = 17
    # options: 1->14, 2->17, 3->20, 4->35
    options = {1: 14, 2: 17, 3: 20, 4: 35}
    opt_key = min(options, key=lambda k: abs(options[k] - ex))
    return {"value": round(ex, 4), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
