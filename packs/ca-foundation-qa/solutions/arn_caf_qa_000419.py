def solve():
    pv = 10000
    fv = 12100
    n = 2
    cagr = (fv / pv) ** (1 / n) - 1
    # cagr = 0.10 exactly
    # option 1: 10% correct
    return {"value": round(cagr * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
