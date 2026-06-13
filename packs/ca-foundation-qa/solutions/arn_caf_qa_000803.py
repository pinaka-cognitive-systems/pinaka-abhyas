def solve():
    # All probabilities sum to 1
    known = 0.1 + 0.3 + 0.2
    k = round(1 - known, 4)  # 0.4
    # Options: 1->0.4, 2->0.3, 3->0.6, 4->0.2
    options = {1: 0.4, 2: 0.3, 3: 0.6, 4: 0.2}
    option_key = [ky for ky, v in options.items() if abs(v - k) < 1e-9][0]
    return {"value": k, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
