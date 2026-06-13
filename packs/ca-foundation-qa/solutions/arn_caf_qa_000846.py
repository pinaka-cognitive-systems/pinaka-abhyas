def solve():
    # cov(X,Y) = r * sdX * sdY
    r = 0.75
    sdX = 4
    sdY = 6
    cov = r * sdX * sdY  # = 0.75 * 24 = 18
    return {"value": cov, "option_key": 1}

if __name__ == "__main__":
    print(solve())
