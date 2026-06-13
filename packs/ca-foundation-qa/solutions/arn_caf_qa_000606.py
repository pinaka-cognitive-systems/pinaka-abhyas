def solve():
    # Kavita: A -> 4 km East -> B -> 3 km South -> C
    # Use coordinate system: East=+x, North=+y
    ax, ay = 0, 0
    bx, by = ax + 4, ay       # 4 km East
    cx, cy = bx, by - 3       # 3 km South
    distance = ((cx - ax)**2 + (cy - ay)**2) ** 0.5
    # 3-4-5 triple: sqrt(16+9)=5
    assert abs(distance - 5.0) < 1e-9
    # Direction: cx > ax (East), cy < ay (South) => South-East, option 1
    return {"value": distance, "option_key": 1}

if __name__ == "__main__":
    print(solve())
