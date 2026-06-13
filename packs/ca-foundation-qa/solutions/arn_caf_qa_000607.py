def solve():
    # Rajan: 3 km North, then 4 km East, then 3 km South.
    # Coordinates: East=+x, North=+y
    x, y = 0, 0
    y += 3   # 3 km North
    x += 4   # 4 km East
    y -= 3   # 3 km South
    # Net: x=4, y=0
    assert x == 4 and y == 0
    distance = (x**2 + y**2) ** 0.5
    assert abs(distance - 4.0) < 1e-9
    # Direction: East (positive x, zero y), option 1
    return {"value": distance, "option_key": 1}

if __name__ == "__main__":
    print(solve())
