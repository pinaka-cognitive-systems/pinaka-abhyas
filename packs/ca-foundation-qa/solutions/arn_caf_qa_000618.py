import json
def solve():
    import math
    # Directions clockwise: N=0, E=1, S=2, W=3
    # Right turn = clockwise = +1
    facing = 0  # North
    x, y = 0, 0
    dx = [0, 1, 0, -1]   # N, E, S, W x-components
    dy = [1, 0, -1, 0]   # N, E, S, W y-components

    # Walk 12 km North
    x += dx[facing] * 12
    y += dy[facing] * 12
    # Turn right (clockwise)
    facing = (facing + 1) % 4  # East
    # Walk 5 km East
    x += dx[facing] * 5
    y += dy[facing] * 5
    # Turn right (clockwise)
    facing = (facing + 1) % 4  # South
    # Walk 12 km South
    x += dx[facing] * 12
    y += dy[facing] * 12

    # Deepak is at (5, 0)
    distance = math.sqrt(x**2 + y**2)
    # X=(0,0) is to the West of Deepak at (5,0)
    # Direction of X from Deepak: x<0 relative -> West
    assert abs(x - 5) < 0.001
    assert abs(y - 0) < 0.001
    assert abs(distance - 5.0) < 0.001
    # Answer: 5 km West = option key 1
    return {"value": int(round(distance)), "option_key": 1}

if __name__ == "__main__":
    print(json.dumps(solve()))
