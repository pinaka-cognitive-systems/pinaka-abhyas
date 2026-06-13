def solve():
    d = 15000
    total = 180000
    profit = 72000
    # A + (A+d) + (A+2d) = total
    # 3A + 3d = total
    A = (total - 3 * d) / 3  # 45000
    B = A + d                 # 60000
    C = A + 2 * d             # 75000
    ratio_sum = A + B + C     # 180000
    C_share = C / ratio_sum * profit  # 5/12 * 72000 = 30000
    C_share = int(C_share)
    # options: 1->30000, 2->36000, 3->24000, 4->40000
    options = {1: 30000, 2: 36000, 3: 24000, 4: 40000}
    option_key = [k for k, v in options.items() if v == C_share][0]
    return {"value": C_share, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
