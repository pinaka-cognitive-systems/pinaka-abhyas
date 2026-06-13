def solve():
    pmf = {1: 0.15, 2: 0.25, 3: 0.35, 4: 0.25}
    # F(3) = P(X <= 3)
    result = round(sum(v for k, v in pmf.items() if k <= 3), 4)  # 0.75
    options = {1: 0.75, 2: 0.35, 3: 1.00, 4: 0.40}
    option_key = [ky for ky, v in options.items() if abs(v - result) < 1e-9][0]
    return {"value": result, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
