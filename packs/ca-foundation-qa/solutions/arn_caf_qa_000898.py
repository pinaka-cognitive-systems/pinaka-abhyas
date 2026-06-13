import math

def solve():
    # Commodity A: p0=100, p1=180, q0=7, q1=2
    # Commodity B: p0=100, p1=60, q0=3, q1=4
    p0 = [100, 100]
    p1 = [180, 60]
    q0 = [7, 3]
    q1 = [2, 4]

    L_num = sum(p1[i] * q0[i] for i in range(2))
    L_den = sum(p0[i] * q0[i] for i in range(2))
    L = L_num / L_den * 100  # 144.0

    P_num = sum(p1[i] * q1[i] for i in range(2))
    P_den = sum(p0[i] * q1[i] for i in range(2))
    P = P_num / P_den * 100  # 100.0

    F = math.sqrt(L * P)     # 120.0 (exact)

    # Option mapping: 1=100 (Paasche), 2=120 (Fisher), 3=122 (Drobisch), 4=144 (Laspeyre)
    assert round(F) == 120
    return {"value": F, "option_key": 2}

if __name__ == "__main__":
    print(solve())
