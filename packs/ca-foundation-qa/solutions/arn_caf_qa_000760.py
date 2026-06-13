def solve():
    data = [12, 18, 24, 30, 36, 42, 48, 54, 60]
    n = len(data)  # 9
    # Q1 position = (n+1)/4 = 2.5
    q1_pos = (n + 1) / 4  # 2.5
    q1_idx_low = int(q1_pos) - 1   # index 1 (0-based) -> value 18
    q1_idx_high = q1_idx_low + 1   # index 2 -> value 24
    frac = q1_pos - int(q1_pos)    # 0.5
    Q1 = data[q1_idx_low] + frac * (data[q1_idx_high] - data[q1_idx_low])  # 21

    # Q3 position = 3*(n+1)/4 = 7.5
    q3_pos = 3 * (n + 1) / 4  # 7.5
    q3_idx_low = int(q3_pos) - 1   # index 6 -> value 48
    q3_idx_high = q3_idx_low + 1   # index 7 -> value 54
    frac3 = q3_pos - int(q3_pos)   # 0.5
    Q3 = data[q3_idx_low] + frac3 * (data[q3_idx_high] - data[q3_idx_low])  # 51

    qd = (Q3 - Q1) / 2  # (51 - 21) / 2 = 15
    # Option 1: 15 (correct)
    # Option 2: 30 (IQR, forgot /2)
    # Option 3: 21 (Q1 itself)
    # Option 4: 12 (formula error)
    return {"value": qd, "option_key": 1}

if __name__ == "__main__":
    print(solve())
