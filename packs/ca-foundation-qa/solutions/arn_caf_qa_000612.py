def solve():
    # Prakash: 16 km East, 4 km North, 9 km South, 4 km West.
    # Coordinates: East=+x, North=+y
    x, y = 0, 0
    x += 16   # East
    y += 4    # North
    y -= 9    # South
    x -= 4    # West
    # H is at (12, -5) from O
    assert x == 12 and y == -5
    # Direction O->H: East (+x) and South (-y) = South-East
    # Direction H->O (reversed): North-West
    # Distance
    distance = (x**2 + y**2) ** 0.5
    # 5-12-13 triple: 5^2+12^2 = 25+144 = 169 = 13^2
    assert abs(distance - 13.0) < 1e-9
    # Answer: North-West, 13 km = option 1
    return {"value": distance, "option_key": 1}

if __name__ == "__main__":
    print(solve())
