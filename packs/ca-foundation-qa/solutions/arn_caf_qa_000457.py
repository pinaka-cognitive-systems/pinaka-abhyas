def solve():
    import math
    n = 6
    value = math.factorial(n - 1)  # (6-1)! = 120
    return {"value": value, "option_key": 2}

if __name__ == "__main__":
    print(solve())
