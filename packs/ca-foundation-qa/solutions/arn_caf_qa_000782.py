def solve():
    pA = 0.3
    pB = 0.5
    # Mutually exclusive: P(A and B) = 0
    p_intersection = 0.0
    p_union = pA + pB - p_intersection  # 0.80
    assert abs(p_union - 0.80) < 1e-10
    return {"value": p_union, "option_key": 1}

if __name__ == "__main__":
    print(solve())
