def solve():
    # Class frequency for 40-60 = CF(up to 60) - CF(up to 40)
    cf_up_to_60 = 35
    cf_up_to_40 = 18
    class_freq = cf_up_to_60 - cf_up_to_40
    # option 1: 17, option 2: 18, option 3: 35, option 4: 11
    options = {1: 17, 2: 18, 3: 35, 4: 11}
    correct = None
    for k, v in options.items():
        if v == class_freq:
            correct = k
            break
    return {"value": class_freq, "option_key": correct}

if __name__ == "__main__":
    print(solve())
