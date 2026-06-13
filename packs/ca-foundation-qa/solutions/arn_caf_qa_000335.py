def solve():
    # Arjun's rate: 1/12 per day, Bhanu's rate: 1/18 per day
    arjun_days = 12
    bhanu_days = 18
    days_together = 4

    combined_rate = 1/arjun_days + 1/bhanu_days  # 5/36
    work_done = combined_rate * days_together      # 20/36 = 5/9
    remaining = 1 - work_done                     # 4/9
    bhanu_rate = 1/bhanu_days                      # 1/18
    extra_days = remaining / bhanu_rate            # 8

    return {"value": extra_days, "option_key": 3}

if __name__ == "__main__":
    print(solve())
