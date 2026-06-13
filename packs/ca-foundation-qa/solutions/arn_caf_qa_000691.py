def solve():
    # Proportionate stratified sampling
    # n_i = (N_i / N) x n
    N_production = 200
    N_marketing = 150
    N_admin = 150
    N = N_production + N_marketing + N_admin  # 500
    n = 50  # total sample

    n_marketing = (N_marketing / N) * n  # (150/500) * 50 = 15

    assert n_marketing == 15.0
    # Option 1: 10 (wrong)
    # Option 2: 15 (correct)
    # Option 3: 20 (wrong - production allocation)
    # Option 4: 25 (wrong - equal split)
    correct_option = 2
    return {"value": int(n_marketing), "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
