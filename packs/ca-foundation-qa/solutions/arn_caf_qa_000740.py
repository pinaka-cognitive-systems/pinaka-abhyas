def solve():
    min_val = 15
    coeff = 0.6
    # (Max - Min) / (Max + Min) = coeff
    # Max - min_val = coeff * (Max + min_val)
    # Max - min_val = coeff * Max + coeff * min_val
    # Max * (1 - coeff) = min_val + coeff * min_val = min_val * (1 + coeff)
    max_val = min_val * (1 + coeff) / (1 - coeff)
    # max_val = 15 * 1.6 / 0.4 = 24 / 0.4 = 60
    range_val = max_val - min_val  # 45
    new_obs = 52
    # Check if new obs falls inside [min_val, max_val]
    new_max = max(max_val, new_obs)
    new_min = min(min_val, new_obs)
    new_range = new_max - new_min  # 52 in [15,60] so range stays 45

    # Statement I: range increases by at most 12 => False (range = 45, no change)
    stmt_I = (new_range > range_val) and (new_range - range_val <= 12)
    # Statement II: original max = 60 => True
    stmt_II = (max_val == 60)
    # Statement III: original range = 45 => True
    stmt_III = (range_val == 45)

    # Only II and III correct => option 1
    assert not stmt_I
    assert stmt_II
    assert stmt_III
    return {"value": max_val, "option_key": 1}

if __name__ == "__main__":
    print(solve())
