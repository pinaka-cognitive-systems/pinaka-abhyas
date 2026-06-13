def solve():
    import math
    # P(X=0) = e^(-lam), P(X=1) = lam*e^(-lam)
    # Setting equal: e^(-lam) = lam*e^(-lam) => lam = 1
    # Verify: with lam=1, P(0)=e^(-1)=0.3679, P(1)=1*e^(-1)=0.3679 -> equal
    lam = 1.0
    p0 = math.exp(-lam)
    p1 = math.exp(-lam) * lam
    assert abs(p0 - p1) < 1e-10, "Constraint not satisfied"
    opts = {1: 1, 2: 2, 3: 0.5, 4: math.e}
    option_key = min(opts, key=lambda k: abs(opts[k] - lam))
    return {"value": lam, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
