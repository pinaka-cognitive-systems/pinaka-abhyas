def solve():
    import math
    # Digits: 2, 3, 5, 7, 9 (5 distinct digits), choose 3, no repetition, ordered
    value = math.factorial(5) // math.factorial(5 - 3)
    # value = 60
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
