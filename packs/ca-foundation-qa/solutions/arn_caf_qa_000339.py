def solve():
    # (80-x)/x = 3 => 80-x = 3x => x = 20
    total = 80
    # milk:water = 3:1, so milk = 3/4 * 80 = 60, water = 20
    water = total / 4
    x = water  # litres removed = water fraction
    return {"value": x, "option_key": 2}

if __name__ == "__main__":
    print(solve())
