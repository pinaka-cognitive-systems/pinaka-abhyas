def solve():
    import math
    n = 5
    total = math.factorial(n - 1)  # (5-1)! = 24
    # Priya and Qasim adjacent: merge into block => 4 units in circle
    forbidden = math.factorial(4 - 1) * math.factorial(2)  # 3! * 2! = 6 * 2 = 12
    value = total - forbidden  # 24 - 12 = 12
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
