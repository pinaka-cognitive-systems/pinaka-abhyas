def solve():
    from fractions import Fraction
    p_a = Fraction(3, 5)
    p_b = Fraction(1, 4)
    p_b_comp = 1 - p_b  # 3/4
    # P(A occurs but B does not) = P(A) * P(B') for independent events
    p_a_not_b = p_a * p_b_comp  # 9/20
    # Options: 1=9/20, 2=3/20, 3=1/10, 4=7/10
    if p_a_not_b == Fraction(9, 20):
        option_key = 1
    elif p_a_not_b == Fraction(3, 20):
        option_key = 2
    elif p_a_not_b == Fraction(1, 10):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p_a_not_b), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
