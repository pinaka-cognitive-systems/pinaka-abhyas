def solve():
    P = 15000
    factor = 1.12551  # (1.03)^4 as given (quarterly, 1 year)
    A = P * factor
    # A = 16882.65
    return {"value": round(A, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
