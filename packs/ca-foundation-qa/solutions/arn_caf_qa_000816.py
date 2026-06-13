def solve():
    # X ~ Binomial(n=3, p=0.05)
    n = 3
    p = 0.05
    q = 1 - p
    ex = n * p
    var = n * p * q
    # ex = 0.15, var = 0.1425
    # options: 1->(0.15, 0.1425), 2->(0.15, 0.15), 3->(0.05, 0.1425), 4->(0.15, 0.0225)
    options = {
        1: (0.15, 0.1425),
        2: (0.15, 0.15),
        3: (0.05, 0.1425),
        4: (0.15, 0.0225)
    }
    # Find option matching both E(X) and Var(X)
    import math
    opt_key = min(options, key=lambda k: math.sqrt((options[k][0]-ex)**2 + (options[k][1]-var)**2))
    return {"value": round(var, 6), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
