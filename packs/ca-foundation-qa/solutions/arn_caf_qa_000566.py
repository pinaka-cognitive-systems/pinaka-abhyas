def solve():
    # Rule: A=1, B=2, ..., Z=26
    # Code for P alone
    p_code = ord('P') - ord('A') + 1  # = 16
    options = {1: 16, 2: 15, 3: 17, 4: 14}
    for k, v in options.items():
        if v == p_code:
            return {"value": p_code, "option_key": k}
    return {"value": p_code, "option_key": -1}

if __name__ == "__main__":
    print(solve())
