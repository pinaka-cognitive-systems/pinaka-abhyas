def solve():
    R = 6000
    FVAF = 5.6371  # ((1.06)^5 - 1)/0.06
    fv = R * FVAF
    # fv = 33822.6
    options = {1: 33822, 2: 30000, 3: 35820, 4: 31800}
    for k, v in options.items():
        if abs(v - fv) < 10:
            return {"value": round(fv, 2), "option_key": k}
    return {"value": round(fv, 2), "option_key": -1}

if __name__ == "__main__":
    print(solve())
