def solve():
    P = 240000
    annual_rate = 0.08
    i = annual_rate / 4  # quarterly rate = 0.02
    n = 4
    factor = 1.0824  # given (1.02)^4
    emi = P * i * factor / (factor - 1)
    # 240000 * 0.02 * 1.0824 / 0.0824 = 5195.52 / 0.0824 = 63052
    return {"value": round(emi), "option_key": 1}

if __name__ == "__main__":
    print(solve())
