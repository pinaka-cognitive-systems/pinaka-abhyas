def solve():
    ear = 0.1025
    m = 2
    # r_nom = m * ((1 + EAR)^(1/m) - 1)
    r_nom = m * ((1 + ear) ** (1 / m) - 1)
    # sqrt(1.1025) = 1.05, so r_nom = 2 * 0.05 = 0.10 = 10%
    # option 1 = 10%
    return {"value": round(r_nom * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
