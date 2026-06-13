def solve():
    IQR = 40
    coeff_qd = 0.25
    # Q3 - Q1 = IQR = 40
    # (Q3 - Q1) / (Q3 + Q1) = coeff_qd
    # => Q3 + Q1 = IQR / coeff_qd = 40 / 0.25 = 160
    sum_q = IQR / coeff_qd  # 160
    Q1 = (sum_q - IQR) / 2  # (160 - 40) / 2 = 60
    Q3 = (sum_q + IQR) / 2  # (160 + 40) / 2 = 100

    # Verify
    assert abs(Q3 - Q1 - IQR) < 1e-9
    assert abs((Q3 - Q1) / (Q3 + Q1) - coeff_qd) < 1e-9

    # Option 1: 60 (Q1, correct)
    # Option 2: 20 (QD = IQR/2)
    # Option 3: 100 (Q3 instead of Q1)
    # Option 4: 80 ((Q3+Q1)/2 = 80, wrong)
    return {"value": Q1, "option_key": 1}

if __name__ == "__main__":
    print(solve())
