def solve():
    C = 5000
    r = 0.08
    g = 0.03
    pv = C / (r - g)   # 5000 / 0.05 = 100000
    return {"value": 100000, "option_key": 2}

if __name__ == "__main__":
    print(solve())
