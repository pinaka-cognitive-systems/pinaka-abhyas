def solve():
    # Price relative = (current price / base price) * 100
    p0 = 40  # base-year price
    p1 = 52  # current-year price
    value = (p1 / p0) * 100  # = 130.0
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
