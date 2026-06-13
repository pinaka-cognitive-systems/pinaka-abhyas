def solve():
    import math
    # FACTOR: 6 distinct letters, F and R never adjacent
    total = math.factorial(6)  # 720
    # Forbidden: F and R adjacent => merge into block => 5 units
    forbidden = math.factorial(5) * math.factorial(2)  # 5! * 2! = 120 * 2 = 240
    value = total - forbidden  # 720 - 240 = 480
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
