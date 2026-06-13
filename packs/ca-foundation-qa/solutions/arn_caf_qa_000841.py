def solve():
    # r = cov(X,Y) / (sdX * sdY)
    cov = 12
    sdX = 4
    sdY = 5
    r = cov / (sdX * sdY)
    # r = 12/20 = 0.60 -> option key 1
    return {"value": round(r, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
