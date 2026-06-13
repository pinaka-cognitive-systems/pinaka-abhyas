def solve():
    R = 15
    diff = 45
    # CI - SI (2yr) = P*(R/100)^2
    P = diff / (R / 100) ** 2   # 45 / 0.0225 = 2000
    # verify
    SI = P * R * 2 / 100
    CI = P * (1 + R / 100) ** 2 - P
    assert abs(CI - SI - diff) < 0.01, f"Verify failed: CI-SI = {CI-SI}"
    return {"value": P, "option_key": 1}

if __name__ == "__main__":
    print(solve())
