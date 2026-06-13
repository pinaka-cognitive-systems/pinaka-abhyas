def solve():
    # Meena starts West, turns right, right, left.
    # Clockwise index: North=0, East=1, South=2, West=3
    # Right = +1 mod 4, Left = -1 mod 4
    heading = 3  # West
    heading = (heading + 1) % 4  # right -> North=0
    heading = (heading + 1) % 4  # right -> East=1
    heading = (heading - 1) % 4  # left -> North=0
    dirs = ["North", "East", "South", "West"]
    assert dirs[heading] == "North"
    return {"value": heading, "option_key": 1}

if __name__ == "__main__":
    print(solve())
