def solve():
    from fractions import Fraction
    outcomes_ge9 = [(i, j) for i in range(1, 7) for j in range(1, 7) if i + j >= 9]
    outcomes_11 = [(i, j) for i, j in outcomes_ge9 if i + j == 11]
    p = Fraction(len(outcomes_11), len(outcomes_ge9))  # 2/10 = 1/5
    # Options: 1=1/5, 2=1/18, 3=2/10 (same as 1/5 unsimplified), 4=1/6
    if p == Fraction(1, 5):
        option_key = 1
    elif p == Fraction(1, 18):
        option_key = 2
    elif p == Fraction(2, 10):
        option_key = 1  # same value
    elif p == Fraction(1, 6):
        option_key = 4
    else:
        option_key = 3
    return {"value": float(p), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
