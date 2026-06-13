def solve():
    data = [8, 12, 16, 18, 20, 24, 28, 32]
    n = len(data)  # 8

    # Q1 at (n+1)/4 = 2.25
    q1_pos = (n + 1) / 4  # 2.25
    q1_idx = int(q1_pos)  # 2
    frac1 = q1_pos - q1_idx  # 0.25
    Q1 = data[q1_idx - 1] + frac1 * (data[q1_idx] - data[q1_idx - 1])  # 13

    # Q3 at 3*(n+1)/4 = 6.75
    q3_pos = 3 * (n + 1) / 4  # 6.75
    q3_idx = int(q3_pos)  # 6
    frac3 = q3_pos - q3_idx  # 0.75
    Q3 = data[q3_idx - 1] + frac3 * (data[q3_idx] - data[q3_idx - 1])  # 27

    qd = (Q3 - Q1) / 2  # 7
    # Option 1: 7 (correct)
    # Option 2: 14 (IQR)
    # Option 3: 20 ((Q1+Q3)/2)
    # Option 4: 27 (Q3 itself)
    return {"value": qd, "option_key": 1}

if __name__ == "__main__":
    print(solve())
