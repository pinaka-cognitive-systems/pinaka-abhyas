def solve():
    P = 10000
    R = 10
    n = 2
    A = P * (1 + R / 100) ** n  # 12100
    CI = A - P                   # 2100
    return {"value": CI, "option_key": 1}

if __name__ == "__main__":
    print(solve())
