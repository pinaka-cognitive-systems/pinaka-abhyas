def solve():
    from fractions import Fraction
    p_city = Fraction(6, 10)
    p_rural = Fraction(4, 10)
    p_high_city = Fraction(3, 10)
    p_high_rural = Fraction(5, 10)
    p_high = p_city * p_high_city + p_rural * p_high_rural  # 0.38 = 19/50
    p_city_given_high = (p_city * p_high_city) / p_high  # 9/19
    # Options: 1=9/19, 2=3/5, 3=10/19, 4=18/38 (same as 9/19)
    if p_city_given_high == Fraction(9, 19):
        option_key = 1
    elif p_city_given_high == Fraction(3, 5):
        option_key = 2
    elif p_city_given_high == Fraction(10, 19):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p_city_given_high), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
