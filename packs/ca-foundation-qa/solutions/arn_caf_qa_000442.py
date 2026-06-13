def solve():
    face = 10000
    coupon_rate = 0.10
    r = 0.12
    n = 3
    factor_n = 1.4049  # given (1.12)^3
    C = face * coupon_rate  # 1000

    pv_factor = 1 / factor_n  # 0.71177
    pvifa = (1 - pv_factor) / r  # (1-0.71177)/0.12 = 0.28823/0.12 = 2.4019
    pv_coupons = C * pvifa
    pv_face = face * pv_factor
    bond_value = pv_coupons + pv_face
    # 2401.9 + 7117.7 = 9519.6 ~ 9520
    return {"value": round(bond_value), "option_key": 1}

if __name__ == "__main__":
    print(solve())
