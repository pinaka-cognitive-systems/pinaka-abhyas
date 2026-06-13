def solve():
    import math
    n = 6
    # Garland/flippable circular: (n-1)!/2
    value = math.factorial(n - 1) // 2  # 5!/2 = 120/2 = 60
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
