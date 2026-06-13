def solve():
    P = 8000
    R = 9
    T = 3
    SI = P * R * T / 100
    # SI = 2160
    # Option 1: 2160 (correct)
    # Option 2: 2880 (T=4 error)
    # Option 3: 2400 (wrong rate 10%)
    # Option 4: 720 (T=1 error)
    return {"value": SI, "option_key": 1}

if __name__ == "__main__":
    print(solve())
