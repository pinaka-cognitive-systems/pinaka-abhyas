def solve():
    # A = FV * i / [(1+i)^n - 1]
    # FV = 46410, i = 0.10, n = 4
    # (1.1)^4 = 1.4641 (given)
    fv = 46410
    i = 0.10
    one_plus_i_n = 1.4641  # (1.1)^4
    fv_factor = (one_plus_i_n - 1) / i  # = 0.4641 / 0.10 = 4.641
    A = fv / fv_factor  # = 46410 / 4.641 = 10000
    # Options: 1=11602.50, 2=10000, 3=9090.91, 4=7602
    return {"value": round(A, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
