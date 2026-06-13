def solve():
    # P(M1 breaks) = 0.1, P(M2 breaks) = 0.2, independent
    p_m1_breaks = 0.1
    p_m2_breaks = 0.2
    p_m1_ok = 1 - p_m1_breaks  # 0.9
    p_m2_ok = 1 - p_m2_breaks  # 0.8
    p_neither = p_m1_ok * p_m2_ok  # 0.72
    result = round(1 - p_neither, 4)  # 0.28
    # Options: 1->0.28, 2->0.30, 3->0.02, 4->0.20
    options = {1: 0.28, 2: 0.30, 3: 0.02, 4: 0.20}
    option_key = [k for k, v in options.items() if abs(v - result) < 1e-9][0]
    return {"value": result, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
