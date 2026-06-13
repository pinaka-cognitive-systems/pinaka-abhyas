def solve():
    import math
    # 4 boys + 3 girls, girls together
    # Treat girls as a block: 5 units arranged in 5! ways, girls internally in 3! ways
    value = math.factorial(5) * math.factorial(3)
    # value = 120 * 6 = 720
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
