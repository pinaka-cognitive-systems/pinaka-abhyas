def solve():
    CF1 = 22000
    CF2 = 24200
    r = 0.10
    cost = 38000
    pv1 = CF1 / (1 + r)       # 20000.0
    pv2 = CF2 / (1 + r) ** 2  # 20000.0
    npv = pv1 + pv2 - cost    # 2000.0
    return {"value": 2000, "option_key": 4}

if __name__ == "__main__":
    print(solve())
