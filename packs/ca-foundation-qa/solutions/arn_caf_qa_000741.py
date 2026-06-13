def solve():
    # Sample A: min_A = 12, coefficient of range = 0.50
    min_A = 12
    coeff_A = 0.50
    # (max_A - min_A) / (max_A + min_A) = coeff_A
    # max_A * (1 - coeff_A) = min_A * (1 + coeff_A)
    max_A = min_A * (1 + coeff_A) / (1 - coeff_A)
    assert max_A == 36.0, f"Expected max_A=36, got {max_A}"

    # Sample B: min_B = 28, range_B = 18
    min_B = 28
    range_B = 18
    max_B = min_B + range_B  # 46

    # Combined
    combined_min = min(min_A, min_B)  # 12
    combined_max = max(max_A, max_B)  # 46
    combined_range = combined_max - combined_min  # 34

    # 34 => option 3
    return {"value": combined_range, "option_key": 3}

if __name__ == "__main__":
    print(solve())
