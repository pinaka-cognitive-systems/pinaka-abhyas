def solve():
    nominal_rate = 10   # % per annum
    m = 2               # half-yearly (2 periods per year)
    EAR = (1 + nominal_rate / (100 * m)) ** m - 1  # (1.05)^2 - 1 = 0.1025
    EAR_percent = EAR * 100   # 10.25
    return {"value": EAR_percent, "option_key": 1}

if __name__ == "__main__":
    print(solve())
