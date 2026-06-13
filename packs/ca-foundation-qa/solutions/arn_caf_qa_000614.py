import json
def solve():
    import math
    # Directions: 0=East, 1=North, 2=West, 3=South
    # Left turn increases direction index by 1 mod 4
    facing = 0  # East
    x, y = 0, 0
    dx = [1, 0, -1, 0]  # East, North, West, South
    dy = [0, 1, 0, -1]

    # Walk 6 km East
    x += dx[facing] * 6
    y += dy[facing] * 6
    # Turn left
    facing = (facing + 1) % 4  # North
    # Walk 4 km North
    x += dx[facing] * 4
    y += dy[facing] * 4
    # Turn left
    facing = (facing + 1) % 4  # West
    # Walk 6 km West
    x += dx[facing] * 6
    y += dy[facing] * 6

    # Final position: x=0, y=4
    distance = math.sqrt(x**2 + y**2)
    # Direction of Q from P: y=4 (North), x=0
    # Answer: 4 km North = option key 1
    assert abs(distance - 4.0) < 0.001
    return {"value": int(distance), "option_key": 1}

if __name__ == "__main__":
    print(json.dumps(solve()))
