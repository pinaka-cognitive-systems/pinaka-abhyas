def solve():
    # Proportionate stratified sampling - multi-step computation + conceptual trap
    # Step 1: compute total N
    N_A = 120
    N_B = 80
    N_C = 60
    N_D = 40
    N = N_A + N_B + N_C + N_D  # 300
    assert N == 300

    # Step 2: proportionate allocation for C
    n = 60  # total sample
    n_C = (N_C / N) * n  # (60/300) * 60 = 12
    assert n_C == 12.0

    # Step 3: expected long-serving in C-sample
    long_serving_C = 20
    expected_long_serving = (long_serving_C / N_C) * n_C  # (20/60) * 12 = 4
    assert expected_long_serving == 4.0

    # Step 4: expected = minimum (4) but NOT guaranteed (hypergeometric variance > 0)
    # The correct answer: 12 from C, sub-requirement NOT automatically guaranteed
    # Option 1: 12 from C, guaranteed - wrong (guaranteed is false)
    # Option 2: 12 from C, NOT guaranteed - correct
    # Option 3: 9 from C, guaranteed - wrong (both count and conclusion are wrong)
    # Option 4: 9 from C, NOT guaranteed - wrong count
    correct_option = 2
    return {"value": int(n_C), "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
