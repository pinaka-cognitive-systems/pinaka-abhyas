def solve():
    import math
    # Start price 100, year 1 rises 50% -> 150, year 2 falls back to 100
    f1 = 150 / 100   # = 1.50
    f2 = 100 / 150   # = 0.6667
    gm = math.sqrt(f1 * f2)
    # gm = sqrt(1.0) = 1.0 -> option 1
    return {"value": round(gm, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
