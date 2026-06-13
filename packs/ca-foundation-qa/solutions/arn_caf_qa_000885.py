def solve():
    meera_nominal = 42000
    price_index = 168
    priya_base_salary = 28000
    meera_real = meera_nominal * 100 / price_index   # = 25000.0
    # Meera real (25000) < Priya (28000), so option 1 is correct
    option_key = 1
    return {"value": meera_real, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
