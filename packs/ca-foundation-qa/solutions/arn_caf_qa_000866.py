def solve():
    n = 10
    sum_x = 50
    sum_y = 80
    sum_x2 = 270
    sum_xy = 430

    numerator = n * sum_xy - sum_x * sum_y   # 10*430 - 50*80 = 4300 - 4000 = 300
    denominator = n * sum_x2 - sum_x ** 2    # 10*270 - 50^2 = 2700 - 2500 = 200
    b_yx = numerator / denominator            # 300 / 200 = 1.5

    return {"value": b_yx, "option_key": 1}

if __name__ == "__main__":
    print(solve())
