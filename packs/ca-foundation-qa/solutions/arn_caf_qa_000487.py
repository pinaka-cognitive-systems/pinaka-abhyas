def solve():
    # Three GP terms: a/r, a, ar; product = a^3
    product = 216
    a = round(product ** (1/3))
    # Verify
    assert a ** 3 == product
    return {"value": a, "option_key": 1}

if __name__ == "__main__":
    print(solve())
