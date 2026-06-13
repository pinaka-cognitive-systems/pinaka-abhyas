def solve():
    # P(A) = 0.4, P(B) = 0.5, P(A and B) = 0.2
    # P(A|B) = P(A and B) / P(B)
    p_a = 0.4
    p_b = 0.5
    p_ab = 0.2
    p_a_given_b = p_ab / p_b
    # p_a_given_b = 0.4
    # options: 1->0.40, 2->0.50, 3->0.20, 4->0.80
    options = {1: 0.40, 2: 0.50, 3: 0.20, 4: 0.80}
    opt_key = min(options, key=lambda k: abs(options[k] - p_a_given_b))
    return {"value": round(p_a_given_b, 4), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
