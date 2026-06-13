import math

def solve():
    # r(x,y) = r(u,v) by invariance under change of origin
    n = 5
    sum_u = 0
    sum_v = 0
    sum_u2 = 10
    sum_v2 = 40
    sum_uv = 12
    numerator = n * sum_uv - sum_u * sum_v   # = 60
    bracket1 = n * sum_u2 - sum_u ** 2       # = 50
    bracket2 = n * sum_v2 - sum_v ** 2       # = 200
    r = numerator / math.sqrt(bracket1 * bracket2)  # = 60/100 = 0.60
    return {"value": round(r, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
