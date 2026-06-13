def solve():
    Q3 = 44
    QD = 8
    # QD = (Q3 - Q1)/2 => Q1 = Q3 - 2*QD
    Q1 = Q3 - 2 * QD  # 28
    # Option 1: 28 (correct)
    # Option 2: 36 (Q3 - QD, off by factor of 2)
    # Option 3: 16 (2*QD = IQR, not Q1)
    # Option 4: 52 (Q3 + QD, sign error)
    return {"value": Q1, "option_key": 1}

if __name__ == "__main__":
    print(solve())
