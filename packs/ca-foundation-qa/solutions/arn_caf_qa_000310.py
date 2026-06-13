def solve():
    P = 50000

    # Phase 1: 10% p.a. for 2 years
    factor1 = 1.21      # (1.10)^2 as given
    A1 = P * factor1    # 60500

    # Phase 2: 12% p.a. for 3 years, starting from A1
    factor2 = 1.404928  # (1.12)^3 as given
    A2 = A1 * factor2   # 84998.14

    return {"value": round(A2, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
