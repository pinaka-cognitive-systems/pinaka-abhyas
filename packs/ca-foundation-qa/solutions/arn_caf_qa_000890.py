def solve():
    current_nominal = 30000
    compound_factor = 1.1664   # (1.08)^2 as given in stem
    future_index = 100 * compound_factor   # = 116.64
    required_nominal = current_nominal * future_index / 100   # = 34992.0
    pct_rise = (required_nominal - current_nominal) / current_nominal * 100   # = 16.64
    # options: 1=16.64%, 2=16%, 3=8%, 4=17%
    option_key = 1
    return {"value": round(pct_rise, 2), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
