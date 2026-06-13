def solve():
    import math
    # BALLOON: 7 letters, L repeated 2 times, O repeated 2 times
    value = math.factorial(7) // (math.factorial(2) * math.factorial(2))
    # value = 1260
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
