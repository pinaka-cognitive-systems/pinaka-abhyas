def solve():
    # Quantities 5k and 3k; subtract 4 from each, ratio becomes 3:1
    # 5k - 4 = 3*(3k - 4) => 5k - 4 = 9k - 12 => 4k = 8 => k = 2
    k = 2
    smaller = 3 * k  # 6
    return {"value": smaller, "option_key": 2}

if __name__ == "__main__":
    print(solve())
