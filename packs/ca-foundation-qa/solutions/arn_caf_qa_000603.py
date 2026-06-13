def solve():
    # Anil faces South, turns 180 degrees, then 90 degrees clockwise.
    # Clockwise direction index: North=0, East=1, South=2, West=3
    dirs_cw = ["North", "East", "South", "West"]
    start = 2  # South
    after_180 = (start + 2) % 4  # North = 0
    after_cw90 = (after_180 + 1) % 4  # East = 1
    assert dirs_cw[after_cw90] == "East"
    return {"value": after_cw90, "option_key": 1}

if __name__ == "__main__":
    print(solve())
