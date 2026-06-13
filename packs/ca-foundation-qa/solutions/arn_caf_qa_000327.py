import math

def solve():
    # log(x) + log(y) = log(12)  =>  xy = 12
    # log(x) - log(y) = log(3)   =>  x/y = 3
    # Multiply: x^2 = 36, x = 6
    # Then y = 12/6 = 2, check x/y = 3: 6/2 = 3 correct
    xy = 12
    x_over_y = 3
    x_sq = xy * x_over_y  # 36
    x = int(x_sq ** 0.5)  # 6
    y = xy // x  # 2
    assert x * y == xy
    assert x // y == x_over_y
    # options: 1->4, 2->6, 3->9, 4->3
    option_map = {4: 1, 6: 2, 9: 3, 3: 4}
    option_key = option_map[x]
    return {"value": x, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
