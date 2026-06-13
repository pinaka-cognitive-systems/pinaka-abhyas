def solve():
    total = 72000
    ratio_a = 3
    ratio_b = 5
    bhanu_share = (ratio_b / (ratio_a + ratio_b)) * total
    # bhanu_share = 45000
    return {"value": bhanu_share, "option_key": 2}

if __name__ == "__main__":
    print(solve())
