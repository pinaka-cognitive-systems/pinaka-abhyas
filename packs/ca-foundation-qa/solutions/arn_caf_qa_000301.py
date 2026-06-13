def solve():
    P = 5000
    r = 0.10
    n = 3
    factor = 1.331  # (1.10)^3 as given
    A = P * factor
    # A = 6655.0
    return {"value": round(A, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
