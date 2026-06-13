import json
def solve():
    import math
    # Directions clockwise: N=0, E=1, S=2, W=3
    # Left turn = counter-clockwise = -1 mod 4
    facing = 1  # East
    x, y = 0, 0
    dx = [0, 1, 0, -1]   # N, E, S, W
    dy = [1, 0, -1, 0]   # N, E, S, W

    # Walk 9 km East to B
    x += dx[facing] * 9
    y += dy[facing] * 9
    # Turn left (counter-clockwise)
    facing = (facing - 1) % 4  # North
    # Walk 7 km North to C
    x += dx[facing] * 7
    y += dy[facing] * 7
    # Turn left (counter-clockwise)
    facing = (facing - 1) % 4  # West
    # Walk 9 km West to D
    x += dx[facing] * 9
    y += dy[facing] * 9

    # D=(0,7)
    distance = math.sqrt(x**2 + y**2)
    assert abs(x - 0) < 0.001
    assert abs(y - 7) < 0.001
    assert abs(distance - 7.0) < 0.001
    # Answer: 7 km = option key 1
    return {"value": int(round(distance)), "option_key": 1}

if __name__ == "__main__":
    print(json.dumps(solve()))
