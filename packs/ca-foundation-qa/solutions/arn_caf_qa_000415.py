def solve():
    PVAF = 2.4869
    # Project A
    CF_A = 20000
    cost_A = 45000
    npv_A = CF_A * PVAF - cost_A   # 49738 - 45000 = 4738

    # Project B
    CF_B = 22000
    cost_B = 48000
    npv_B = CF_B * PVAF - cost_B   # 54711.8 - 48000 = 6711.8

    # B > A; difference
    diff = round(npv_B - npv_A)    # 1974
    # option 2: Project B, difference = 1974
    return {"value": diff, "option_key": 2}

if __name__ == "__main__":
    print(solve())
