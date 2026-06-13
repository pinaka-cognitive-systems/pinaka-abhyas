def solve():
    # classes: 0-10, 10-20, 20-30, 30-40, 40-50
    # frequencies: 4, 10, 16, 6, 4
    freqs = [4, 10, 16, 6, 4]
    boundaries = [(0,10),(10,20),(20,30),(30,40),(40,50)]
    n = sum(freqs)  # 40

    # cumulative frequencies
    cf = []
    cum = 0
    for f in freqs:
        cum += f
        cf.append(cum)

    # Q1 at n/4 = 10
    q1_pos = n / 4  # 10.0
    # find class for Q1
    q1_class = None
    for i, c in enumerate(cf):
        if c >= q1_pos:
            q1_class = i
            break
    L1 = boundaries[q1_class][0]
    f1 = freqs[q1_class]
    cf_prev1 = cf[q1_class - 1] if q1_class > 0 else 0
    h = boundaries[q1_class][1] - boundaries[q1_class][0]
    Q1 = L1 + ((q1_pos - cf_prev1) / f1) * h  # 16.0

    # Q3 at 3n/4 = 30
    q3_pos = 3 * n / 4  # 30.0
    q3_class = None
    for i, c in enumerate(cf):
        if c >= q3_pos:
            q3_class = i
            break
    L3 = boundaries[q3_class][0]
    f3 = freqs[q3_class]
    cf_prev3 = cf[q3_class - 1] if q3_class > 0 else 0
    h3 = boundaries[q3_class][1] - boundaries[q3_class][0]
    Q3 = L3 + ((q3_pos - cf_prev3) / f3) * h3  # 30.0

    qd = (Q3 - Q1) / 2  # 7.0
    # Option 1: 7 (correct)
    # Option 2: 14 (IQR, forgot /2)
    # Option 3: 16 (Q1 itself)
    # Option 4: 8 (formula error)
    return {"value": qd, "option_key": 1}

if __name__ == "__main__":
    print(solve())
