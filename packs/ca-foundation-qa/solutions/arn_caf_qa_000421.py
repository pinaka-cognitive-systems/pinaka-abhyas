def solve():
    r_nom = 0.09
    r_inf = 0.04
    r_real = (1 + r_nom) / (1 + r_inf) - 1
    # r_real = 1.09/1.04 - 1 = 0.048077... approx 4.81%
    # option 1 = 4.81%
    return {"value": round(r_real * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
