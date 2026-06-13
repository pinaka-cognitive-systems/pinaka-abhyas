def solve():
    import math
    # P fixed at position 1, remaining 3 letters arrange in 3! ways
    value = math.factorial(3)  # 3! = 6
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
