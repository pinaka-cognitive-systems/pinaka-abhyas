def solve():
    x_bar = 4
    y_bar = 11
    sum_products = 50   # corrected sum of products of deviations
    sum_sq_x = 20       # corrected sum of squared deviations of X

    b_yx = sum_products / sum_sq_x   # 50 / 20 = 2.5
    a = y_bar - b_yx * x_bar         # 11 - 2.5*4 = 11 - 10 = 1

    # Regression equation: Y = 2.5X + 1  => option 1
    return {"value": {"b_yx": b_yx, "intercept": a}, "option_key": 1}

if __name__ == "__main__":
    print(solve())
