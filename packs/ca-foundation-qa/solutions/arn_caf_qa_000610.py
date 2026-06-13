def solve():
    # Asha: 3 km East, then turn left (East -> North), 2 km North
    # Bina: 3 km North, then turn left (North -> West), 2 km West
    # Coordinates: East=+x, North=+y
    # Asha
    ax, ay = 0, 0
    ax += 3  # East
    # turn left from East = North
    ay += 2  # North
    # Asha at (3, 2)

    # Bina
    bx, by = 0, 0
    by += 3  # North
    # turn left from North = West
    bx -= 2  # West
    # Bina at (-2, 3)

    assert ax == 3 and ay == 2
    assert bx == -2 and by == 3

    east_diff = ax - bx  # Asha x minus Bina x
    assert east_diff == 5  # Asha is 5 km East of Bina
    # Option 1: "Asha is 5 km East of Bina"
    return {"value": east_diff, "option_key": 1}

if __name__ == "__main__":
    print(solve())
