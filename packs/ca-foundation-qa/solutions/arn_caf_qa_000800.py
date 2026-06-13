def solve():
    # P(A) = 0.4, P(B) = 0.5, independent
    p_a = 0.4
    p_b = 0.5
    result = round(p_a * p_b, 4)  # 0.20
    # Options: 1->0.20, 2->0.90, 3->0.70, 4->0.10
    options = {1: 0.20, 2: 0.90, 3: 0.70, 4: 0.10}
    option_key = [k for k, v in options.items() if abs(v - result) < 1e-9][0]
    return {"value": result, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
