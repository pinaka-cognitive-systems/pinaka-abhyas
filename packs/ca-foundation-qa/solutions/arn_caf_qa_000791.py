def solve():
    from fractions import Fraction
    p_m1 = Fraction(60, 100)
    p_m2 = Fraction(40, 100)
    p_d_given_m1 = Fraction(2, 100)
    p_d_given_m2 = Fraction(5, 100)
    p_d = p_m1 * p_d_given_m1 + p_m2 * p_d_given_m2  # 0.032 = 4/125
    p_m1_given_d = (p_m1 * p_d_given_m1) / p_d  # 3/8
    # Options: 1=3/8, 2=5/8, 3=3/5, 4=2/7
    if p_m1_given_d == Fraction(3, 8):
        option_key = 1
    elif p_m1_given_d == Fraction(5, 8):
        option_key = 2
    elif p_m1_given_d == Fraction(3, 5):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p_m1_given_d), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
