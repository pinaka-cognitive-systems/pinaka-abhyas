def solve():
    data = [10, 25, 35, 40, 45, 55, 65]
    n = len(data)  # 7

    # Q1 at (n+1)/4 = 2nd position
    q1_pos = (n + 1) / 4  # 2.0
    Q1 = data[int(q1_pos) - 1]  # 25

    # Q3 at 3*(n+1)/4 = 6th position
    q3_pos = 3 * (n + 1) / 4  # 6.0
    Q3 = data[int(q3_pos) - 1]  # 55

    qd = (Q3 - Q1) / 2  # 15
    # Option 1: 15 (correct)
    # Option 2: 30 (IQR)
    # Option 3: 25 (Q1)
    # Option 4: 40 (median)
    return {"value": qd, "option_key": 1}

if __name__ == "__main__":
    print(solve())
