def solve():
    r_nominal = 0.08
    m = 2  # half-yearly
    factor = 1.0816  # (1.04)^2 as given
    EAR = factor - 1  # 0.0816
    EAR_percent = EAR * 100  # 8.16
    return {"value": round(EAR_percent, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
