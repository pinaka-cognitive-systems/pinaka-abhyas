def solve():
    # Weighted Average of Price Relatives
    # Good A: p0=10, q0=5, p1=15
    # Good B: p0=4, q0=25, p1=5
    # Good C: p0=2, q0=50, p1=3
    data = [
        {"p0": 10, "q0": 5,  "p1": 15},
        {"p0": 4,  "q0": 25, "p1": 5},
        {"p0": 2,  "q0": 50, "p1": 3},
    ]
    numerator = 0
    denominator = 0
    for d in data:
        I_i = (d["p1"] / d["p0"]) * 100   # price relative
        w_i = d["p0"] * d["q0"]            # base-year value weight
        numerator += I_i * w_i
        denominator += w_i
    # 35000 / 250 = 140.00
    index = round(numerator / denominator, 2)
    assert index == 140.0, f"Got {index}"
    return {"value": index, "option_key": 3}

if __name__ == "__main__":
    print(solve())
