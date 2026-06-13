def solve():
    import math
    # 5 students, 3 distinct ranked prizes, no student gets more than one
    value = math.factorial(5) // math.factorial(5 - 3)
    # value = 60
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
