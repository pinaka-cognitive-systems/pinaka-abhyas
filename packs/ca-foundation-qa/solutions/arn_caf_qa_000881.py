def solve():
    # Real wage = Nominal wage / (CPI / 100)
    nominal_wage = 18000
    cpi = 150
    real_wage = nominal_wage / (cpi / 100)  # = 18000 / 1.5 = 12000
    value = real_wage  # 12000.0
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
