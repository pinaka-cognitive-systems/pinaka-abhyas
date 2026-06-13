import math

def solve():
    n = 5
    sum_x = 15
    sum_y = 20
    sum_x2 = 55
    sum_y2 = 90
    sum_xy = 65
    numerator = n * sum_xy - sum_x * sum_y   # = 325 - 300 = 25
    bracket1 = n * sum_x2 - sum_x ** 2       # = 275 - 225 = 50
    bracket2 = n * sum_y2 - sum_y ** 2       # = 450 - 400 = 50
    r = numerator / math.sqrt(bracket1 * bracket2)  # = 25/50 = 0.50
    return {"value": round(r, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
