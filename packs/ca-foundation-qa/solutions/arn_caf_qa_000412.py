def solve():
    CF = 15000
    PVAF = 2.4018
    cost = 33000
    pv = CF * PVAF      # 36027.0
    npv = pv - cost     # 3027.0
    return {"value": 3027, "option_key": 2}

if __name__ == "__main__":
    print(solve())
