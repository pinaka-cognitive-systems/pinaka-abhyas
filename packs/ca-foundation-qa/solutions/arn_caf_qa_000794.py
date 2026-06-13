def solve():
    from fractions import Fraction
    # Equal prior probability for each urn
    p_prior = Fraction(1, 3)
    # Urn P: 3 red, 2 blue (total 5)
    p_red_P = Fraction(3, 5)
    # Urn Q: 1 red, 4 blue (total 5)
    p_red_Q = Fraction(1, 5)
    # Urn R: 2 red, 2 blue (total 4)
    p_red_R = Fraction(2, 4)
    # Total probability of drawing red
    p_red = p_prior * p_red_P + p_prior * p_red_Q + p_prior * p_red_R
    # Posterior: P(Q | Red)
    p_Q_given_red = (p_prior * p_red_Q) / p_red
    # Options: 1=2/13, 2=6/13, 3=5/13, 4=1/3
    if p_Q_given_red == Fraction(2, 13):
        option_key = 1
    elif p_Q_given_red == Fraction(6, 13):
        option_key = 2
    elif p_Q_given_red == Fraction(5, 13):
        option_key = 3
    else:
        option_key = 4
    return {"value": float(p_Q_given_red), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
