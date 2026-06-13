def solve():
    # Paasche Price Index = (sum p1*q1) / (sum p0*q1) * 100
    commodities = [
        {"p0": 40, "p1": 50, "q1": 10},
        {"p0": 50, "p1": 60, "q1": 20},
        {"p0": 60, "p1": 66, "q1": 30},
    ]
    sum_p1q1 = sum(c["p1"] * c["q1"] for c in commodities)  # 500+1200+1980 = 3680
    sum_p0q1 = sum(c["p0"] * c["q1"] for c in commodities)  # 400+1000+1800 = 3200
    value = round((sum_p1q1 / sum_p0q1) * 100, 1)  # 115.0
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
