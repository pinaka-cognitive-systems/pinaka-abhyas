def solve():
    from math import comb
    # Method: fix positions of 4 aces among 52 slots
    # Total ways to assign 4 ace-positions: C(52,4)
    total = comb(52, 4)          # 270725
    # Favourable: 2 aces in first 26 slots, 2 in last 26 slots
    # = C(26,2) * C(26,2)
    fav = comb(26, 2) * comb(26, 2)  # 325 * 325 = 105625
    prob = fav / total
    # Verify via partition method: C(4,2)*C(48,24)/C(52,26)
    p2 = comb(4, 2) * comb(48, 24) / comb(52, 26)
    assert abs(prob - p2) < 1e-9, f"{prob} != {p2}"
    # option 1 corresponds to C(26,2)^2 / C(52,4)
    return {"value": prob, "option_key": 1}

if __name__ == "__main__":
    print(solve())
