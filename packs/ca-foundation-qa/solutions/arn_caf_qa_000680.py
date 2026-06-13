def solve():
    # From less-than ogive: count in [25, 45] = CF(45) - CF(25)
    cf_at_45 = 60
    cf_at_25 = 20
    count = cf_at_45 - cf_at_25
    # option 1: 40, option 2: 60, option 3: 20, option 4: 35
    options = {1: 40, 2: 60, 3: 20, 4: 35}
    correct = None
    for k, v in options.items():
        if v == count:
            correct = k
            break
    return {"value": count, "option_key": correct}

if __name__ == "__main__":
    print(solve())
