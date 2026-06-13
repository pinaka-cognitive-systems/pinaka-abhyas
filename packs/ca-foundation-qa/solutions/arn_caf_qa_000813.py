def solve():
    # Fair die, payment: 6 if roll=6, 3 if roll=3 or 4, 0 otherwise
    # P(payment=6) = 1/6, P(payment=3) = 2/6, P(payment=0) = 3/6
    ex = 6 * (1/6) + 3 * (2/6) + 0 * (3/6)
    # ex = 1 + 1 + 0 = 2.0
    # options: 1->1.50, 2->2.00, 3->1.00, 4->3.00
    options = {1: 1.50, 2: 2.00, 3: 1.00, 4: 3.00}
    opt_key = min(options, key=lambda k: abs(options[k] - ex))
    return {"value": round(ex, 4), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
