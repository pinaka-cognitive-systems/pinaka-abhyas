def solve():
    # FV of ordinary annuity: half-yearly payments
    # A = 4000, nominal annual rate = 8% compounded half-yearly
    # Period rate i = 8%/2 = 4% = 0.04, n = 4 half-years
    # (1.04)^4 = 1.1699 (given)
    A = 4000
    i = 0.04
    one_plus_i_n = 1.1699  # (1.04)^4
    fv = A * (one_plus_i_n - 1) / i
    # fv = 4000 * 0.1699/0.04 = 4000 * 4.2475 = 16990.0
    # Options: 1=16000, 2=16990, 3=16640, 4=18024
    return {"value": round(fv, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
