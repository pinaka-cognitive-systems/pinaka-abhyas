def solve():
    # Component bar chart: A=35%, B=45%, C=20%; total=100 units
    a_pct = 35
    b_pct = 45
    # c_pct = 100 - 35 - 45 = 20
    # C segment starts where B ends
    c_start = a_pct + b_pct  # 80
    return {"value": c_start, "option_key": 1}

if __name__ == "__main__":
    print(solve())
