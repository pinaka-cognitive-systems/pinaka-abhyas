def solve():
    # PV of ordinary annuity = A * [1 - (1+i)^(-n)] / i
    # A = 3000, i = 0.08, n = 4
    # (1.08)^(-4) = 0.7350 (given)
    A = 3000
    i = 0.08
    inv_factor = 0.7350  # (1.08)^-4
    pv = A * (1 - inv_factor) / i
    # pv = 3000 * 0.265 / 0.08 = 3000 * 3.3125 = 9937.50
    # Options: 1=9937.50, 2=12000, 3=10732.50, 4=13518.75
    return {"value": round(pv, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
