def solve():
    import math
    # 5 books, P and Q must be in odd positions (1, 3, 5)
    # Choose 2 odd positions for P and Q: P(3,2) = 3*2 = 6
    p_3_2 = math.factorial(3) // math.factorial(3 - 2)  # 6
    # Remaining 3 books in remaining 3 positions: 3! = 6
    remaining = math.factorial(3)  # 6
    value = p_3_2 * remaining  # 6 * 6 = 36
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
