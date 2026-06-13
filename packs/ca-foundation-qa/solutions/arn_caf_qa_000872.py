def solve():
    # Laspeyres Price Index
    # Commodity A: p0=4, q0=40, p1=5
    # Commodity B: p0=5, q0=30, p1=8
    # Commodity C: p0=10, q0=20, p1=12
    p0 = [4, 5, 10]
    p1 = [5, 8, 12]
    q0 = [40, 30, 20]

    numerator = sum(p1[i] * q0[i] for i in range(3))    # 200+240+240 = 680
    denominator = sum(p0[i] * q0[i] for i in range(3))  # 160+150+200 = 510
    laspeyres = round(numerator / denominator * 100, 2)
    # 680/510*100 = 133.33
    assert laspeyres == 133.33, f"Got {laspeyres}"
    return {"value": laspeyres, "option_key": 3}

if __name__ == "__main__":
    print(solve())
