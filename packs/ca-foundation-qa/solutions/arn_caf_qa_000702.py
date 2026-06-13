def solve():
    profits = [2, 8, 32, 128]
    n = len(profits)
    product = 1
    for p in profits:
        product *= p
    gm = product ** (1 / n)
    # options: 1->16, 2->32, 3->42.5, 4->48
    options = {1: 16, 2: 32, 3: 42.5, 4: 48}
    option_key = [k for k, v in options.items() if abs(v - gm) < 0.01][0]
    return {"value": gm, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
