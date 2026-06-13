def solve():
    import math
    # 7 people, Arjun and Bhavna must sit together
    # Treat them as 1 block => 6 units in a circle
    circular_arrangements = math.factorial(6 - 1)  # (6-1)! = 120
    internal_swaps = math.factorial(2)  # 2! = 2
    value = circular_arrangements * internal_swaps  # 120 * 2 = 1440
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
