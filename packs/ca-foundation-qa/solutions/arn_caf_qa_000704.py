def solve():
    n = 25
    wrong_mean = 40
    wrong_val = 32
    correct_val = 52
    wrong_sum = n * wrong_mean
    correct_sum = wrong_sum - wrong_val + correct_val
    correct_mean = correct_sum / n
    # options: 1->40.2, 2->40.4, 3->40.8, 4->41.2
    options = {1: 40.2, 2: 40.4, 3: 40.8, 4: 41.2}
    option_key = [k for k, v in options.items() if abs(v - correct_mean) < 0.01][0]
    return {"value": correct_mean, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
