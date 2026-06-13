def solve():
    from fractions import Fraction
    p_a = Fraction(2, 3)
    p_b = Fraction(3, 4)
    # P(at least one) = 1 - P(neither) = 1 - P(A') * P(B')
    p_neither = (1 - p_a) * (1 - p_b)  # (1/3)*(1/4) = 1/12
    p_at_least_one = 1 - p_neither  # 11/12
    # Options: 1=11/12, 2=1/2, 3=5/12, 4=7/12
    if p_at_least_one == Fraction(11, 12):
        option_key = 1
    elif p_at_least_one == Fraction(1, 2):
        option_key = 2
    elif p_at_least_one == Fraction(5, 12):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p_at_least_one), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
