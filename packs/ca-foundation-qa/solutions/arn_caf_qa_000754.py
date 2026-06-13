def solve():
    # Series P: mean=25, SD=5
    # Series Q: mean=20, SD=6
    cv_P = (5 / 25) * 100
    cv_Q = (6 / 20) * 100
    # cv_P=20, cv_Q=30 -> Q has greater CV
    # Options: 1 -> Q with 30%, 2 -> P with 20%, 3 -> Q with 24%, 4 -> equal
    # Encode as: 1 correct (Q, 30%)
    # value = cv_Q = 30
    options = {1: 30, 2: 20, 3: 24, 4: 0}
    correct = 1  # Series Q, CV=30%
    return {"value": cv_Q, "option_key": correct}

if __name__ == "__main__":
    print(solve())
