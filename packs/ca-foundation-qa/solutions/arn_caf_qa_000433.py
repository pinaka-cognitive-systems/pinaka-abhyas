def solve():
    P = 300000
    annual_rate = 0.09
    i = annual_rate / 12  # 0.0075
    n = 36
    factor = 1.3090  # given (1.0075)^36
    emi = P * i * factor / (factor - 1)
    # 300000 * 0.0075 * 1.3090 / 0.3090 = 2945.25 / 0.3090 = 9531
    return {"value": round(emi), "option_key": 1}

if __name__ == "__main__":
    print(solve())
