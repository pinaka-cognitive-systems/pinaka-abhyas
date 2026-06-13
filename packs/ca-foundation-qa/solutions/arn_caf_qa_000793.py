def solve():
    from fractions import Fraction
    white_initial = 4
    black_initial = 6
    total_initial = white_initial + black_initial  # 10
    # First draw is white (given)
    white_remaining = white_initial - 1  # 3
    total_remaining = total_initial - 1  # 9
    p = Fraction(white_remaining, total_remaining)  # 1/3
    # Options: 1=1/3, 2=2/5, 3=4/9, 4=3/10
    if p == Fraction(1, 3):
        option_key = 1
    elif p == Fraction(2, 5):
        option_key = 2
    elif p == Fraction(4, 9):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
