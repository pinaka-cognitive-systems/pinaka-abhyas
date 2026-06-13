def solve():
    P = 5000
    R = 8
    n = 2
    SI = P * R * n / 100          # 800
    CI = P * (1 + R / 100) ** n - P  # 832
    diff = CI - SI                # 32
    # Also: P*(R/100)^2 = 5000*0.0064 = 32
    return {"value": diff, "option_key": 1}

if __name__ == "__main__":
    print(solve())
