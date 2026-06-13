def solve():
    # Simplify a^3 / a^(-2)
    # Quotient rule: a^m / a^n = a^(m-n)
    m = 3
    n = -2
    result_exp = m - n  # 3 - (-2) = 5
    # a^5 corresponds to option key 1
    # options: 1->a^5, 2->a^1, 3->a^6, 4->a^(-6)
    option_map = {5: 1, 1: 2, 6: 3, -6: 4}
    option_key = option_map[result_exp]
    return {"value": result_exp, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
