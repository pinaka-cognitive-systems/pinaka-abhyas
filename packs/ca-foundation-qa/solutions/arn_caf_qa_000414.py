def solve():
    CF = 15000
    PVAF = 2.4869
    salvage = 20000
    PVIF = 0.7513
    cost = 50000
    pv_savings = CF * PVAF          # 37303.5
    pv_scrap = salvage * PVIF       # 15026.0
    total_pv = pv_savings + pv_scrap  # 52329.5
    npv = total_pv - cost           # 2329.5 -> rounds to 2330
    return {"value": 2330, "option_key": 1}

if __name__ == "__main__":
    print(solve())
