def solve():
    cost = 75000
    book_value = 48000
    n = 2
    ratio = book_value / cost  # 0.64
    one_minus_r = ratio ** (1 / n)  # 0.8
    r = 1 - one_minus_r  # 0.20
    rate_pct = round(r * 100)  # 20
    return {"value": rate_pct, "option_key": 1}

if __name__ == "__main__":
    print(solve())
