def solve():
    r = 0.10
    n = 3
    diff = 310  # CI - SI given

    # CI - SI for n=3 = P * r^2 * (3 + r)
    coefficient = (r ** 2) * (3 + r)   # 0.01 * 3.1 = 0.031
    P = diff / coefficient              # 310 / 0.031 = 10000

    # Verification
    SI = P * r * n                         # 3000
    factor_3 = 1.331                        # (1.10)^3 given
    CI = P * (factor_3 - 1)               # 3310
    assert round(CI - SI, 2) == 310.0, f"Verification failed: CI-SI={CI-SI}"

    return {"value": round(P, 2), "option_key": 3}

if __name__ == "__main__":
    print(solve())
