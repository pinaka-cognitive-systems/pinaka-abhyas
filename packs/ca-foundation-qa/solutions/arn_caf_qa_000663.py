def solve():
    # Total sales = sum of all quarterly values
    q1, q2, q3, q4 = 40, 55, 50, 60
    total = q1 + q2 + q3 + q4
    # total = 205
    return {"value": total, "option_key": 2}

if __name__ == "__main__":
    print(solve())
