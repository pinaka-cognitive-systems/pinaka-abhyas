def solve():
    PMT = 4000
    r = 0.10
    n = 3
    # ordinary annuity: payment at end of year t grows for (n-t) years
    fv = PMT * (1.10**2) + PMT * (1.10**1) + PMT * (1.10**0)
    # = 4000*1.21 + 4000*1.10 + 4000 = 4840 + 4400 + 4000 = 13240
    options = {1: 13240, 2: 12000, 3: 13310, 4: 13200}
    for k, v in options.items():
        if abs(v - fv) < 1:
            return {"value": fv, "option_key": k}
    return {"value": fv, "option_key": -1}

if __name__ == "__main__":
    print(solve())
