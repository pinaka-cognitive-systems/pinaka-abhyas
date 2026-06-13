import math

def solve():
    # X ranks (mean rank assigned for 3-way tie at written test)
    x_r = [2.0, 2.0, 2.0, 4.0, 5.0, 6.0]
    # Y ranks (oral interview, no ties)
    y_r = [2.0, 1.0, 4.0, 3.0, 6.0, 5.0]
    n = 6
    # Compute sum_d^2
    sum_d2 = sum((a - b) ** 2 for a, b in zip(x_r, y_r))
    # Tie correction for X: one group of m=3
    m = 3
    corr_x = (m**3 - m) / 12  # = 2.0
    T_x = (n**3 - n) / 12 - corr_x  # = 17.5 - 2 = 15.5
    T_y = (n**3 - n) / 12             # = 17.5 (no ties in Y)
    # Corrected Spearman formula
    r_s = (T_x + T_y - sum_d2) / (2 * math.sqrt(T_x * T_y))
    # r_s = 25/sqrt(1085) = 0.7590 -> option 2
    return {"value": round(r_s, 4), "option_key": 2}

if __name__ == "__main__":
    print(solve())
