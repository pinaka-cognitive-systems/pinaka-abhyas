def solve():
    mean = 4
    variance = 2.4
    q = variance / mean  # 0.6
    p = 1 - q            # 0.4
    n = mean / p         # 10
    n = round(n)
    opts = {1: 10, 2: 8, 3: 6, 4: 20}
    option_key = min(opts, key=lambda k: abs(opts[k] - n))
    return {"value": n, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
