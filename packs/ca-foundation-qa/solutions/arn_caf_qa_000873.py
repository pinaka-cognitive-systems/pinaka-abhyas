def solve():
    # Paasche Price Index
    # Item A: p0=5, q0=20, p1=7, q1=24
    # Item B: p0=4, q0=30, p1=6, q1=25
    # Item C: p0=8, q0=10, p1=10, q1=15
    p0 = [5, 4, 8]
    p1 = [7, 6, 10]
    q1 = [24, 25, 15]

    numerator = sum(p1[i] * q1[i] for i in range(3))    # 168+150+150 = 468
    denominator = sum(p0[i] * q1[i] for i in range(3))  # 120+100+120 = 340
    paasche = round(numerator / denominator * 100, 2)
    # 468/340*100 = 137.647... -> 137.65
    assert paasche == 137.65, f"Got {paasche}"
    return {"value": paasche, "option_key": 4}

if __name__ == "__main__":
    print(solve())
