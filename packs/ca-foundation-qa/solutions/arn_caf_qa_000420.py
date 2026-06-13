def solve():
    pv = 25
    fv = 36.45
    n = 3
    cagr = (fv / pv) ** (1 / n) - 1
    # cagr approx 0.13304... => closest to 13.3%
    # option 1 = 13.3%
    return {"value": round(cagr * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
