def solve():
    r_nom = 0.12
    m = 4
    ear = (1 + r_nom / m) ** m - 1
    # (1.03)^4 - 1 = 0.12550881... => 12.55%
    # option 1 = 12.55%
    return {"value": round(ear * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
