def solve():
    npv = 14770
    cost = 80000
    PVAF = 3.7908
    # CF = (NPV + C_0) / PVAF
    CF = (npv + cost) / PVAF   # 94770 / 3.7908 = 25000.0
    return {"value": 25000, "option_key": 2}

if __name__ == "__main__":
    print(solve())
