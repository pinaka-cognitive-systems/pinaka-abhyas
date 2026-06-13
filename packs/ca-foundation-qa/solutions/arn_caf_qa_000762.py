def solve():
    ages = sorted([25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50])
    n = len(ages)  # 11

    # Q1 at (n+1)/4 = 3rd position
    q1_pos = (n + 1) / 4  # 3.0
    Q1 = ages[int(q1_pos) - 1]  # 30

    # Q3 at 3(n+1)/4 = 9th position
    q3_pos = 3 * (n + 1) / 4  # 9.0
    Q3 = ages[int(q3_pos) - 1]  # 45

    coeff_qd = (Q3 - Q1) / (Q3 + Q1)  # 15/75 = 0.20

    # Option 1: 0.20 (correct)
    # Option 2: 7.5 (QD, not coefficient)
    # Option 3: 0.16 (wrong formula)
    # Option 4: 15 (IQR)
    return {"value": round(coeff_qd, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
