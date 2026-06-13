def solve():
    # FV of ordinary annuity = A * [(1+i)^n - 1] / i
    # A = 5000, i = 0.10, n = 3
    # (1.1)^3 = 1.331 (given)
    A = 5000
    i = 0.10
    n = 3
    fv_factor = (1.331 - 1) / i  # = 0.331 / 0.10 = 3.31
    fv = A * fv_factor  # = 5000 * 3.31 = 16550
    # Options: 1=15000, 2=16550, 3=18205, 4=17000
    return {"value": fv, "option_key": 2}

if __name__ == "__main__":
    print(solve())
