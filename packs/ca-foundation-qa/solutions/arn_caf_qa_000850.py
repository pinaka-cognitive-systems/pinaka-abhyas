import math

def solve():
    # r = cov(X,Y) / (sdX * sdY)
    cov = 8
    var_x = 16
    var_y = 25
    sdX = math.sqrt(var_x)  # = 4
    sdY = math.sqrt(var_y)  # = 5
    r = cov / (sdX * sdY)   # = 8/20 = 0.40
    return {"value": round(r, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
