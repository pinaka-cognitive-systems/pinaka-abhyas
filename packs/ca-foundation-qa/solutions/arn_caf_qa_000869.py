def solve():
    import math
    b_yx = 0.8
    b_xy = 0.45

    r_squared = b_yx * b_xy   # 0.36
    # Both slopes positive => r is positive
    r = math.sqrt(r_squared)  # 0.60

    return {"value": round(r, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
