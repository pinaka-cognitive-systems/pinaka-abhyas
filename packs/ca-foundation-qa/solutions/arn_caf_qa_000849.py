import math

def solve():
    n = 10
    sum_x = 20
    sum_y = 30
    sum_x2 = 50
    sum_y2 = 100
    sum_xy = 67
    numerator = n * sum_xy - sum_x * sum_y   # = 670 - 600 = 70
    bracket1 = n * sum_x2 - sum_x ** 2       # = 500 - 400 = 100
    bracket2 = n * sum_y2 - sum_y ** 2       # = 1000 - 900 = 100
    r = numerator / math.sqrt(bracket1 * bracket2)  # = 70/100 = 0.70
    return {"value": round(r, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
