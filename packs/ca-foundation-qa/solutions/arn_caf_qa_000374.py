def solve():
    P = 5000
    SI_ankit = P * 8 * 3 / 100   # 1200
    SI_bharat = P * 10 * 2 / 100  # 1000
    diff = SI_ankit - SI_bharat    # 200, Ankit is higher
    # option 1: Ankit earns Rs 200 more than Bharat (correct)
    return {"value": diff, "option_key": 1}

if __name__ == "__main__":
    print(solve())
