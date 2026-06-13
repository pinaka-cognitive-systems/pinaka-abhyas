import math

def solve():
    n = 8
    sum_x = 40
    sum_y = 56
    sum_x2 = 220
    sum_y2 = 420
    sum_xy = 302
    numerator = n * sum_xy - sum_x * sum_y   # = 2416 - 2240 = 176
    bracket1 = n * sum_x2 - sum_x ** 2       # = 1760 - 1600 = 160
    bracket2 = n * sum_y2 - sum_y ** 2       # = 3360 - 3136 = 224
    r = numerator / math.sqrt(bracket1 * bracket2)  # = 176/189.31 = 0.9297
    # rounds to 0.93 -> option key 1
    return {"value": round(r, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
