def solve():
    # 3, x, 48 in continued proportion: x^2 = 3 * 48 = 144 => x = 12
    a, b = 3, 48
    x = int((a * b) ** 0.5)  # = 12
    return {"value": x, "option_key": 2}

if __name__ == "__main__":
    print(solve())
