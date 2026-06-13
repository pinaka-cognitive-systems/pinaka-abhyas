def solve():
    n_total = 100
    n_math = 60
    n_stat = 45
    n_both = 25
    # M only + S only = exclusive union
    m_only = n_math - n_both  # 35
    s_only = n_stat - n_both  # 20
    exclusive_union = m_only + s_only  # 55
    # Options: 1=55/100, 2=80/100, 3=25/100, 4=105/100
    from fractions import Fraction
    p = Fraction(exclusive_union, n_total)
    if p == Fraction(55, 100):
        option_key = 1
    elif p == Fraction(80, 100):
        option_key = 2
    elif p == Fraction(25, 100):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
