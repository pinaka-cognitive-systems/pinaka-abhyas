def solve():
    # P(King or Heart) = P(King) + P(Heart) - P(King and Heart)
    total = 52
    n_king = 4
    n_heart = 13
    n_king_and_heart = 1  # King of Hearts
    numerator = n_king + n_heart - n_king_and_heart  # 16
    # 16/52 = 4/13
    from fractions import Fraction
    p = Fraction(numerator, total)
    # Options: 1=4/13, 2=17/52, 3=16/52, 4=1/4
    if p == Fraction(4, 13):
        option_key = 1
    elif p == Fraction(17, 52):
        option_key = 2
    elif p == Fraction(16, 52):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
