def solve():
    # GP: 5, 10, 20, 40, 80 (a=5, r=2, n=5)
    import math
    terms = [5 * (2 ** i) for i in range(5)]
    product = 1
    for t in terms:
        product *= t
    gm = round(product ** (1/5))
    # gm = 5 * 2^2 = 20
    assert gm == 20
    # option 1: 5 * 2^2 = 20
    return {"value": gm, "option_key": 1}

if __name__ == "__main__":
    print(solve())
