def solve():
    pmf = {0: 0.20, 1: 0.30, 2: 0.35, 3: 0.15}
    result = round(sum(v for k, v in pmf.items() if k >= 2), 4)  # 0.50
    options = {1: 0.50, 2: 0.35, 3: 0.65, 4: 0.15}
    option_key = [ky for ky, v in options.items() if abs(v - result) < 1e-9][0]
    return {"value": result, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
