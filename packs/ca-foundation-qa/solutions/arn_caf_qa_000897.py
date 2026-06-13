import math

def solve():
    # Commodity X: p0=100, p1=140, q0=5, q1=8
    # Commodity Y: p0=100, p1=160, q0=10, q1=5
    p0 = [100, 100]
    p1 = [140, 160]
    q0 = [5, 10]
    q1 = [8, 5]

    L_num = sum(p1[i] * q0[i] for i in range(2))
    L_den = sum(p0[i] * q0[i] for i in range(2))
    L = L_num / L_den * 100  # 153.33

    P_num = sum(p1[i] * q1[i] for i in range(2))
    P_den = sum(p0[i] * q1[i] for i in range(2))
    P = P_num / P_den * 100  # 147.69

    F = math.sqrt(L * P)     # 150.49
    F_rounded = round(F)      # 150

    # Option mapping: 1=148 (Paasche), 2=150 (Fisher), 3=151 (Drobisch), 4=153 (Laspeyre)
    return {"value": round(F, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
