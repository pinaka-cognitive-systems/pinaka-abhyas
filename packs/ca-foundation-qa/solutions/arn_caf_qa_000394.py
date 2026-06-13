def solve():
    # Step 1: Back-calculate P from CI - SI difference
    # CI - SI over n years at rate r = P * [(1+r)^n - 1 - n*r]
    # Given: CI - SI = 310, r = 0.10, n = 3, (1.1)^3 = 1.331
    r = 0.10
    n = 3
    one_plus_r_n = 1.331  # (1.1)^3
    ci_si_diff = 310
    factor = one_plus_r_n - 1 - n * r  # = 1.331 - 1 - 0.30 = 0.031
    P = ci_si_diff / factor  # = 310 / 0.031 = 10000

    # Verify
    ci = P * (one_plus_r_n - 1)  # = 10000 * 0.331 = 3310
    si = P * r * n                # = 10000 * 0.10 * 3 = 3000
    assert abs((ci - si) - ci_si_diff) < 1e-6, f"CI-SI check failed: {ci-si}"
    assert abs(P - 10000) < 1e-6, f"P check failed: {P}"

    # Step 2: PV of P received 3 years from now at 10%
    pv = P / one_plus_r_n  # = 10000 / 1.331 = 7513.52...
    pv_rounded = round(pv)  # = 7513

    # Options: 1=7513, 2=10000, 3=8264, 4=7692
    return {"value": pv_rounded, "option_key": 1}

if __name__ == "__main__":
    print(solve())
