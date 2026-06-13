def solve():
    a_invest = 30000
    b_invest = 50000
    total_invest = a_invest + b_invest
    profit = 24000
    a_share = (a_invest / total_invest) * profit
    return {"value": a_share, "option_key": 1}

if __name__ == "__main__":
    print(solve())
