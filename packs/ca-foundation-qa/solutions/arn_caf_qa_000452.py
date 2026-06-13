def solve():
    import math
    # MOTHER: 6 distinct letters, choose 3 ordered without repetition
    value = math.factorial(6) // math.factorial(6 - 3)
    # value = 120
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
