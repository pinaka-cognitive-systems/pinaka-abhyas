def solve():
    P = 8000
    factor = 1.1025  # (1.05)^2 as given
    A = P * factor
    CI = A - P
    # CI = 820.0
    return {"value": round(CI, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
