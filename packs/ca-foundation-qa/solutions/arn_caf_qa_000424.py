def solve():
    r_nom = 0.15
    r_inf = 0.06
    r_real = (1 + r_nom) / (1 + r_inf) - 1
    # 1.15/1.06 = 1.084905... => r_real = 8.49%
    # option 1 = "8.49%, using (1 + nominal)/(1 + inflation) - 1"
    return {"value": round(r_real * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
