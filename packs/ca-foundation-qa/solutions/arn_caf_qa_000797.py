def solve():
    from fractions import Fraction
    p_a = Fraction(1, 2)
    p_b = Fraction(1, 3)
    p_c = Fraction(1, 4)
    p_a_ = 1 - p_a  # 1/2
    p_b_ = 1 - p_b  # 2/3
    p_c_ = 1 - p_c  # 3/4
    # Exactly one of three independent events
    p_only_a = p_a * p_b_ * p_c_  # 1/4
    p_only_b = p_a_ * p_b * p_c_  # 1/8
    p_only_c = p_a_ * p_b_ * p_c  # 1/12
    p_exactly_one = p_only_a + p_only_b + p_only_c  # 11/24
    # Options: 1=11/24, 2=3/4, 3=1/24, 4=1/4
    if p_exactly_one == Fraction(11, 24):
        option_key = 1
    elif p_exactly_one == Fraction(3, 4):
        option_key = 2
    elif p_exactly_one == Fraction(1, 24):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p_exactly_one), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
