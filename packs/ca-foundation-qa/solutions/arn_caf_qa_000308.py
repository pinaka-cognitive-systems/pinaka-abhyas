def solve():
    P = 40000
    r = 0.06
    repayment = 15000

    # End of Year 1
    bal_y1 = P * (1 + r)       # 42400
    bal_y1_after = bal_y1 - repayment  # 27400

    # End of Year 2 (no further payment)
    bal_y2 = bal_y1_after * (1 + r)   # 29044
    return {"value": round(bal_y2, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
