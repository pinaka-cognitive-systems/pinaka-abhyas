def solve():
    # Bond: face = 1000, coupon rate = 9% p.a., maturity = 2 years, required return = 6%
    face = 1000
    coupon = face * 0.09  # = 90
    r = 0.06
    # Given: (1.06)^2 = 1.1236
    r1 = 1.06
    r2 = 1.1236

    pv_c1 = coupon / r1         # year-1 coupon PV
    pv_c2 = coupon / r2         # year-2 coupon PV
    pv_face = face / r2         # year-2 face value PV

    price = round(pv_c1 + pv_c2 + pv_face, 2)
    # price should equal Rs 1055.00
    return {"value": price, "option_key": 2}

if __name__ == "__main__":
    print(solve())
