def solve():
    import math
    n = 7
    value = math.factorial(n - 1) // 2  # necklace = (n-1)!/2 = 6!/2 = 360
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
