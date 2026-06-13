def solve():
    C = 7000
    r = 0.05
    pv_ordinary = C / r     # 140000
    pv_due = pv_ordinary * (1 + r)   # 147000
    return {"value": 147000, "option_key": 2}

if __name__ == "__main__":
    print(solve())
