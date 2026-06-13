import json
def solve():
    import math
    # O=(0,0)
    x, y = 0, 0
    # Walk 10 km North
    y += 10
    # Walk 6 km East
    x += 6
    # Walk 10 km South
    y -= 10
    # C = (x, y) = (6, 0)
    distance = math.sqrt(x**2 + y**2)
    # Direction: x=6 (East), y=0 -> due East
    # Answer: 6 km East = option key 1
    assert abs(distance - 6.0) < 0.001
    assert y == 0 and x > 0  # confirms East direction
    return {"value": int(distance), "option_key": 1}

if __name__ == "__main__":
    print(json.dumps(solve()))
