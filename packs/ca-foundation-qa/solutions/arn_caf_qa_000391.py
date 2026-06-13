def solve():
    # PV = FV / (1+i)^n
    # FV = 13310, i = 0.10, n = 3
    # (1.1)^3 = 1.331 (given)
    fv = 13310
    one_plus_i_n = 1.331  # (1.1)^3
    pv = fv / one_plus_i_n  # = 13310 / 1.331 = 10000
    # Options: 1=13310, 2=10000, 3=11000, 4=9000
    return {"value": round(pv, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
