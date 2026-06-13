def solve():
    mean_A = 200
    sd_A = 40
    mean_B = 150
    sd_B = 45

    cv_A = (sd_A / mean_A) * 100  # 20.0
    cv_B = (sd_B / mean_B) * 100  # 30.0

    # Line B has higher CV
    # Option 1: Line B, CV=30% (correct)
    # Option 2: Line A, CV=20% (wrong line)
    # Option 3: Line B, CV=20% (right line, wrong CV)
    # Option 4: Line A, CV=30% (wrong line, wrong CV)
    assert cv_B > cv_A  # B has greater relative variability
    return {"value": cv_B, "option_key": 1}

if __name__ == "__main__":
    print(solve())
