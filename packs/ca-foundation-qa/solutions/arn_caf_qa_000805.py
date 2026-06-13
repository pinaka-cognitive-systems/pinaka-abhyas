def solve():
    from fractions import Fraction
    # P(X=x) = x/c, x in {1,2,3}, sum = 1
    values = [1, 2, 3]
    c = sum(values)  # c = 6
    p_x2 = Fraction(2, c)  # 2/6 = 1/3
    # Options: 1->1/3, 2->2/3, 3->1/6, 4->2/6 (=1/3 but distinct label)
    # Key 4 is 2/6 which equals 1/3 but we treat as distinct option label
    # Correct answer is key 1 (1/3)
    options = {1: Fraction(1, 3), 2: Fraction(2, 3), 3: Fraction(1, 6), 4: Fraction(1, 2)}
    option_key = [k for k, v in options.items() if v == p_x2][0]
    return {"value": float(p_x2), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
