def solve():
    P = 120000
    annual_rate = 0.12
    i = annual_rate / 12  # monthly rate = 0.01
    n = 24
    factor = 1.2697  # given (1.01)^24
    emi = P * i * factor / (factor - 1)
    # emi = 120000 * 0.01 * 1.2697 / 0.2697 = 1523.64 / 0.2697 = 5649
    return {"value": round(emi), "option_key": 1}

if __name__ == "__main__":
    print(solve())
