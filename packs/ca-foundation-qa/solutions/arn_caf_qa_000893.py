def solve():
    # Commodity data: (p0, p1, q0)
    commodities = [
        (10, 14, 3),   # A
        (5,  6,  10),  # B
    ]
    sum_p1q0 = sum(p1 * q0 for p0, p1, q0 in commodities)   # = 42 + 60 = 102
    sum_p0q0 = sum(p0 * q0 for p0, p1, q0 in commodities)   # = 30 + 50 = 80
    laspeyres = sum_p1q0 / sum_p0q0 * 100                    # = 127.5
    option_key = 1  # 127.5
    return {"value": laspeyres, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
