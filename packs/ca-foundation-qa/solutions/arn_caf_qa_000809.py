def solve():
    from fractions import Fraction
    # P(X=k) = k/10 for k=1,2,3,4
    pmf = {k: Fraction(k, 10) for k in [1, 2, 3, 4]}
    # P(X <= 3 | X >= 2) = P(2 <= X <= 3) / P(X >= 2)
    numerator = sum(pmf[k] for k in [2, 3])        # 5/10
    denominator = sum(pmf[k] for k in [2, 3, 4])   # 9/10
    result = numerator / denominator                 # 5/9
    options = {1: Fraction(5, 9), 2: Fraction(5, 10), 3: Fraction(5, 8), 4: Fraction(3, 5)}
    option_key = [k for k, v in options.items() if v == result][0]
    return {"value": float(result), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
