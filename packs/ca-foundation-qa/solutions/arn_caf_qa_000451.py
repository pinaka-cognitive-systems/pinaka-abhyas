def solve():
    import math
    value = math.factorial(7) // math.factorial(7 - 3)
    # value = 210
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
