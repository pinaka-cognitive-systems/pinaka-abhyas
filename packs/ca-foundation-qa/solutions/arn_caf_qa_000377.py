def solve():
    P = 8000
    annual_rate = 10
    T_years = 1.5
    # half-yearly: rate per period = 10/2 = 5%, periods = 1.5*2 = 3
    r = annual_rate / 2   # 5%
    n = int(T_years * 2)  # 3
    A = P * (1 + r / 100) ** n   # 8000 * 1.157625 = 9261
    CI = A - P                    # 1261
    return {"value": round(CI), "option_key": 1}

if __name__ == "__main__":
    print(solve())
