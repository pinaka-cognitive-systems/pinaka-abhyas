def solve():
    # 3p + 2q = 28
    # 4p + 5q = 56
    # Multiply: 12p + 8q = 112, 12p + 15q = 168
    # Subtract: 7q = 56 => q = 8
    # p = (28 - 2*8)/3 = 12/3 = 4
    q = (168 - 112) / 7
    p = (28 - 2 * q) / 3
    return {"value": q, "option_key": 3}

if __name__ == "__main__":
    print(solve())
