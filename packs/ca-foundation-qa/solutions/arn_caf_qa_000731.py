def solve():
    import math
    # Verify with a concrete example: data = [1, 4, 9], k = 3
    data = [1, 4, 9]
    n = len(data)
    k = 3
    G = math.prod(data) ** (1/n)
    new_data = [k * x for x in data]
    new_G = math.prod(new_data) ** (1/n)
    expected = k * G
    assert abs(new_G - expected) < 1e-9, "Property check failed"
    # New GM = k * G -> option 1
    return {"value": round(new_G, 6), "option_key": 1}

if __name__ == "__main__":
    print(solve())
