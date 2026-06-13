def solve():
    n = 10
    sum_x = 50
    sum_y = 60
    sum_xy = 330
    sum_x2 = 300
    b_yx = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x**2)
    # b_yx = 300/500 = 0.6 -> option 1
    return {"value": round(b_yx, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
