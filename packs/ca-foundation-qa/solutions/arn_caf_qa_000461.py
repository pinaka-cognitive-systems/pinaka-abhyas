def solve():
    import math
    # 4 couples, husband always immediately right of wife
    # Each couple is a fixed block (no internal choice)
    # 4 blocks in a circle: (4-1)! = 3! = 6
    value = math.factorial(4 - 1)
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
