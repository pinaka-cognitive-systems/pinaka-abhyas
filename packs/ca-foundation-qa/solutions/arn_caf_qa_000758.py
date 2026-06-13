def solve():
    n = 50
    sum_x = 1750
    sum_x2 = 63700
    mean = sum_x / n          # 35
    variance = sum_x2 / n - mean ** 2  # 1274 - 1225 = 49
    sd = variance ** 0.5       # 7
    # Option 1: 7 (correct)
    # Option 2: 49 (variance, forgot sqrt)
    # Option 3: ~9.22 (used n-1 incorrectly)
    # Option 4: 5 (arithmetic slip)
    return {"value": sd, "option_key": 1}

if __name__ == "__main__":
    print(solve())
