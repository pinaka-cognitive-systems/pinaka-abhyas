def solve():
    pA = 0.6
    pB = 0.4
    pAB = 0.25  # P(A intersection B)
    p_union = pA + pB - pAB   # 0.75
    # P(A' inter B') = P((A union B)') = 1 - P(A union B)
    result = 1 - p_union       # 0.25
    assert abs(p_union - 0.75) < 1e-10
    assert abs(result - 0.25) < 1e-10
    return {"value": result, "option_key": 1}

if __name__ == "__main__":
    print(solve())
