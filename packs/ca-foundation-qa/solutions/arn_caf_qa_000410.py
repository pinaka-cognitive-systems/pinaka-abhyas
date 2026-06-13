def solve():
    C = 750           # quarterly dividend
    r_old = 0.10 / 4  # 0.025
    r_new = 0.12 / 4  # 0.03
    pv_old = C / r_old   # 30000
    pv_new = C / r_new   # 25000
    fall = pv_old - pv_new   # 5000
    return {"value": 5000, "option_key": 1}

if __name__ == "__main__":
    print(solve())
