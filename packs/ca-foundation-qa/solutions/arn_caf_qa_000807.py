def solve():
    p = 0.6
    q = 1 - p  # 0.4
    variance = round(p * q, 4)  # 0.24
    options = {1: 0.24, 2: 0.36, 3: 0.60, 4: 0.16}
    option_key = [k for k, v in options.items() if abs(v - variance) < 1e-9][0]
    return {"value": variance, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
