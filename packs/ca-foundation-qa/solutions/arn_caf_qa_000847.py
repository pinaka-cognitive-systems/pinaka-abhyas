import math

def solve():
    n = 5
    sum_x = 10
    sum_y = 15
    sum_x2 = 40
    sum_y2 = 65
    sum_xy = 46
    numerator = n * sum_xy - sum_x * sum_y   # = 230 - 150 = 80
    bracket1 = n * sum_x2 - sum_x ** 2       # = 200 - 100 = 100
    bracket2 = n * sum_y2 - sum_y ** 2       # = 325 - 225 = 100
    r = numerator / math.sqrt(bracket1 * bracket2)  # = 80/100 = 0.80
    return {"value": round(r, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
