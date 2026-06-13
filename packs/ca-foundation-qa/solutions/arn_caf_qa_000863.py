def solve():
    b_yx = 1.5
    # U = (X - 5) / 2  =>  X = 2U + 5, scale d_X = 2
    # V = (Y - 10) / 3  =>  Y = 3V + 10, scale d_Y = 3
    d_x = 2.0
    d_y = 3.0
    # b_VU = (d_Y_inv / d_X_inv) * b_yx where d_Y_inv = 1/d_Y, d_X_inv = 1/d_X
    # equivalently: b_VU = (1/d_Y) / (1/d_X) * b_yx = (d_X / d_Y) * ...
    # cov(V,U) = (1/(d_x*d_y)) * cov(Y,X)
    # var(U) = (1/d_x^2) * var(X)
    # b_VU = cov(V,U)/var(U) = [cov(Y,X)/(d_x*d_y)] / [var(X)/d_x^2]
    #       = d_x / d_y * b_yx / d_x  ... let me be careful
    # = [1/(d_x*d_y)] / [1/d_x^2] * b_yx = (d_x^2)/(d_x*d_y) * b_yx = (d_x/d_y) * b_yx
    b_vu = (d_x / d_y) * b_yx
    # b_vu = (2/3)*1.5 = 1.0 -> option 2
    return {"value": b_vu, "option_key": 2}

if __name__ == "__main__":
    print(solve())
