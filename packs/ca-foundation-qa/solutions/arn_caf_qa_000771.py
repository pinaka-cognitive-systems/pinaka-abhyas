import math

def solve():
    n = 8
    sum_x = 120
    sum_x2 = 1960
    mean = sum_x / n           # 15.0
    variance = sum_x2 / n - mean ** 2  # 245 - 225 = 20
    sd = math.sqrt(variance)   # sqrt(20) ~ 4.472
    cv = (sd / mean) * 100     # ~ 29.81 ~ 30%
    # Options: 1=25%, 2=20%, 3=30%, 4=15%
    option_key = 3
    return {"value": round(cv, 2), "option_key": option_key}

if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
