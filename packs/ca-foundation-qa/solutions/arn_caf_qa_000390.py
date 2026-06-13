def solve():
    # PV of annuity-due = A * [1-(1+i)^(-n)]/i * (1+i)
    # A = 5000, i = 0.10, n = 4
    # (1.1)^(-4) = 0.6830 (given)
    A = 5000
    i = 0.10
    inv_factor = 0.6830  # (1.1)^-4
    pv_ordinary = A * (1 - inv_factor) / i  # = 5000 * 0.317/0.10 = 5000 * 3.17 = 15850
    pv_due = pv_ordinary * (1 + i)  # = 15850 * 1.10 = 17435
    # Options: 1=14415, 2=15850, 3=17435, 4=20000
    return {"value": round(pv_due, 2), "option_key": 3}

if __name__ == "__main__":
    print(solve())
