def solve():
    V0 = 10000
    Vn = 14641
    n = 4
    cagr = (Vn / V0) ** (1 / n) - 1   # (1.4641)^0.25 - 1 = 0.10
    return {"value": 0.10, "option_key": 2}

if __name__ == "__main__":
    print(solve())
