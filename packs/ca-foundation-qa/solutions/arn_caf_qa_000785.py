def solve():
    pA = 0.4
    pB = 0.35
    p_union = 0.60
    # Rearranged addition theorem
    p_intersection = pA + pB - p_union  # 0.15
    # Conditional probability
    p_A_given_B = p_intersection / pB   # 0.15/0.35 = 3/7
    assert abs(p_intersection - 0.15) < 1e-10
    assert abs(p_A_given_B - 3/7) < 1e-10
    return {"value": p_A_given_B, "option_key": 1}

if __name__ == "__main__":
    print(solve())
