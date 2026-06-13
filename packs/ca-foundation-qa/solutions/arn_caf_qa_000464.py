def solve():
    import math
    # MARKET = 6 letters, M and K must be together
    # Treat MK as 1 block: 5 units arranged in 5! ways
    # Internal order of block: 2! = 2
    value = math.factorial(5) * math.factorial(2)  # 120 * 2 = 240
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
