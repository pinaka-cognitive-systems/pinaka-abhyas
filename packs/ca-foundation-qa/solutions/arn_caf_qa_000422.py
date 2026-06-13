def solve():
    r_nom = 0.12
    r_real_min = 0.07
    # Fisher: (1 + r_nom) = (1 + r_real)(1 + r_inf)
    # max r_inf = (1 + r_nom)/(1 + r_real_min) - 1
    r_inf_max = (1 + r_nom) / (1 + r_real_min) - 1
    # 1.12/1.07 - 1 = 0.04673... => 4.67%
    # option 1 = 4.67%
    return {"value": round(r_inf_max * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
