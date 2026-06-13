def solve():
    import math
    AM = 5
    HM = 3.2
    # GM^2 = AM * HM
    gm_sq = AM * HM  # = 16
    gm = math.sqrt(gm_sq)  # = 4
    return {"value": gm, "option_key": 1}

if __name__ == "__main__":
    print(solve())
