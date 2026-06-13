def solve():
    # Vijay starts North, then: R, L, L, R, R
    # Clockwise index: North=0, East=1, South=2, West=3
    # Right=+1, Left=-1
    dirs = ["North", "East", "South", "West"]
    heading = 0  # North
    turns = [+1, -1, -1, +1, +1]  # R, L, L, R, R
    for t in turns:
        heading = (heading + t) % 4
    assert dirs[heading] == "East"
    return {"value": dirs[heading], "option_key": 1}

if __name__ == "__main__":
    print(solve())
