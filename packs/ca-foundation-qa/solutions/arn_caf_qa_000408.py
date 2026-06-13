def solve():
    C = 9000          # semi-annual payment
    r_annual = 0.12
    r_semi = r_annual / 2   # 0.06
    pv = C / r_semi   # 150000
    return {"value": 150000, "option_key": 2}

if __name__ == "__main__":
    print(solve())
