def solve():
    nA = 35  # cricket
    nB = 25  # football
    nAB = 10  # both
    exactly_one = nA + nB - 2 * nAB  # 35 + 25 - 20 = 40
    # option 1 = 40
    return {"value": exactly_one, "option_key": 1}

if __name__ == "__main__":
    print(solve())
