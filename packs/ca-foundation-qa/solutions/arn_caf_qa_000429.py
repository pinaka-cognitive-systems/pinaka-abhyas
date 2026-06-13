def solve():
    r_nom = 0.24
    m = 12
    ear = (1 + r_nom / m) ** m - 1
    # (1.02)^12 - 1 = 0.26824... => 26.82%
    # option 1 = 26.82%
    return {"value": round(ear * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
