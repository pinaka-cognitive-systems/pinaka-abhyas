def solve():
    # SP = CP * 1.2, SP = 840
    sp = 840
    profit_pct = 0.20
    cp = sp / (1 + profit_pct)
    return {"value": cp, "option_key": 1}

if __name__ == "__main__":
    print(solve())
