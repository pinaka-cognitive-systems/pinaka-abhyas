def solve():
    # Tiered-rate perpetuity
    # Fund earns 9% on first 100000 and 12% on balance above 100000
    # Annual scholarship = 18000
    # Income = 0.09 * 100000 + 0.12 * (P - 100000) = 18000
    # 9000 + 0.12*P - 12000 = 18000
    # 0.12*P - 3000 = 18000
    # 0.12*P = 21000
    # P = 175000

    target_payment = 18000
    tier1_principal = 100000
    rate1 = 0.09
    rate2 = 0.12

    # solve: rate1 * tier1_principal + rate2 * (P - tier1_principal) = target_payment
    # rate1*tier1 + rate2*P - rate2*tier1 = target
    # rate2*P = target - rate1*tier1 + rate2*tier1
    # rate2*P = target + (rate2 - rate1)*tier1
    P = (target_payment + (rate2 - rate1) * tier1_principal) / rate2
    # P = (18000 + (0.03)*100000) / 0.12 = (18000 + 3000) / 0.12 = 21000 / 0.12 = 175000

    options = {1: 175000, 2: 200000, 3: 150000, 4: 166667}
    for k, v in options.items():
        if abs(v - P) < 5:
            return {"value": P, "option_key": k}
    return {"value": P, "option_key": -1}

if __name__ == "__main__":
    print(solve())
