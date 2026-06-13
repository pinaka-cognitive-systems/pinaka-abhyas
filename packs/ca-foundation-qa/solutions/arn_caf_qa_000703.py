def solve():
    speeds = [20, 30, 60]
    n = len(speeds)
    hm = n / sum(1 / s for s in speeds)
    # options: 1->36.67 (AM), 2->32.7 (GM), 3->30 (HM), 4->35 (wrong weighted)
    # The correct answer is option 3 (harmonic mean = 30)
    options = {1: 36.67, 2: 32.7, 3: 30.0, 4: 35.0}
    option_key = [k for k, v in options.items() if abs(v - hm) < 0.1][0]
    return {"value": hm, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
