def solve():
    face = 1000
    coupon_rate = 0.08
    required_rate = 0.10
    years = 1
    coupon = face * coupon_rate  # 80
    total_cf = coupon + face  # 1080
    bond_value = total_cf / (1 + required_rate)  # 1080 / 1.10 = 981.818...
    return {"value": round(bond_value, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
