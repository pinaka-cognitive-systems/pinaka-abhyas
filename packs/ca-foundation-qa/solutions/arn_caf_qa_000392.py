def solve():
    # PV = FV / (1+i)^n
    # Nominal annual rate 10% compounded semi-annually
    # i = 10%/2 = 5% per half-year, n = 2*2 = 4 half-years
    # FV = 12155, (1.05)^4 = 1.2155 (given)
    fv = 12155
    one_plus_i_n = 1.2155  # (1.05)^4
    pv = fv / one_plus_i_n  # = 12155 / 1.2155 = 10000
    # Options: 1=11050, 2=10000, 3=10988, 4=12155
    return {"value": round(pv, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
