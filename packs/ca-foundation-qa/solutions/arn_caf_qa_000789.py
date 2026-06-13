def solve():
    red_initial = 5
    blue_initial = 3
    total_initial = red_initial + blue_initial  # 8
    # First draw is red (given)
    red_remaining = red_initial - 1  # 4
    total_remaining = total_initial - 1  # 7
    from fractions import Fraction
    p = Fraction(red_remaining, total_remaining)  # 4/7
    # Options: 1=4/7, 2=5/8, 3=5/7, 4=4/8
    if p == Fraction(4, 7):
        option_key = 1
    elif p == Fraction(5, 8):
        option_key = 2
    elif p == Fraction(5, 7):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
