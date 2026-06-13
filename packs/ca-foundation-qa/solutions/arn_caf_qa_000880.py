import math


def solve():
    # Fisher Ideal Index = sqrt(Laspeyres * Paasche)
    # Laspeyres = (sum p1*q0) / (sum p0*q0) * 100
    # Paasche   = (sum p1*q1) / (sum p0*q1) * 100
    commodities = [
        {"p0": 10, "p1": 15, "q0": 100, "q1": 20},
        {"p0": 20, "p1": 24, "q0": 50,  "q1": 50},
        {"p0": 30, "p1": 33, "q0": 10,  "q1": 80},
    ]
    sum_p1q0 = sum(c["p1"] * c["q0"] for c in commodities)  # 1500+1200+330 = 3030
    sum_p0q0 = sum(c["p0"] * c["q0"] for c in commodities)  # 1000+1000+300 = 2300
    sum_p1q1 = sum(c["p1"] * c["q1"] for c in commodities)  # 300+1200+2640 = 4140
    sum_p0q1 = sum(c["p0"] * c["q1"] for c in commodities)  # 200+1000+2400 = 3600
    laspeyres = (sum_p1q0 / sum_p0q0) * 100  # 131.74
    paasche = (sum_p1q1 / sum_p0q1) * 100    # 115.0
    fisher = math.sqrt(laspeyres * paasche)   # 123.1
    value = round(fisher, 1)
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
