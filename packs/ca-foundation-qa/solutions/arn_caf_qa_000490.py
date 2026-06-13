def solve():
    # GP: 4, G1, G2, 108 => r^3 = 108/4 = 27 => r = 3
    a = 4
    b = 108
    r = round((b / a) ** (1/3))
    assert r ** 3 == b / a
    G1 = a * r
    G2 = a * r * r
    assert G2 == 36
    # Larger inserted term is G2
    return {"value": G2, "option_key": 1}

if __name__ == "__main__":
    print(solve())
