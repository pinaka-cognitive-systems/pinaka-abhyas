def solve():
    P = 10000
    annual_rate = 10
    T_years = 1
    r = annual_rate / 2   # 5% half-yearly
    n = T_years * 2        # 2 periods
    A = P * (1 + r / 100) ** n   # 10000 * 1.1025 = 11025
    CI = A - P                    # 1025
    return {"value": CI, "option_key": 1}

if __name__ == "__main__":
    print(solve())
