def solve():
    Q1 = 30
    Q3 = 70
    qd = (Q3 - Q1) / 2  # = 20
    # Option 1: 20 (correct)
    # Option 2: 40 (IQR, forgot /2)
    # Option 3: 50 ((Q1+Q3)/2)
    # Option 4: 70 (Q3 itself)
    return {"value": qd, "option_key": 1}

if __name__ == "__main__":
    print(solve())
