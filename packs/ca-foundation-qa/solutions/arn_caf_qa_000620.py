import json
def solve():
    import math
    # Directions clockwise: N=0, E=1, S=2, W=3
    # Right turn = +1, Left turn = -1
    facing = 0  # North
    x, y = 0, 0
    dx = [0, 1, 0, -1]   # N, E, S, W
    dy = [1, 0, -1, 0]   # N, E, S, W

    steps = [
        ('forward', 20),
        ('right', 0),
        ('forward', 15),
        ('left', 0),
        ('forward', 5),
        ('right', 0),
        ('forward', 5),
        ('right', 0),
        ('forward', 25),
    ]

    for action, dist in steps:
        if action == 'forward':
            x += dx[facing] * dist
            y += dy[facing] * dist
        elif action == 'right':
            facing = (facing + 1) % 4
        elif action == 'left':
            facing = (facing - 1) % 4

    # Q should be (20, 0)
    assert abs(x - 20) < 0.001, f"Expected x=20, got {x}"
    assert abs(y - 0) < 0.001, f"Expected y=0, got {y}"

    P = (0, 0)
    Q = (x, y)
    pq_dist = math.sqrt((Q[0]-P[0])**2 + (Q[1]-P[1])**2)
    F = ((P[0]+Q[0])/2, (P[1]+Q[1])/2)
    qf_dist = math.sqrt((F[0]-Q[0])**2 + (F[1]-Q[1])**2)

    assert abs(pq_dist - 20.0) < 0.001
    assert abs(qf_dist - 10.0) < 0.001
    # F=(10,0), Q=(20,0): F is West of Q
    # Answer: 10 km West = option key 1
    return {"value": int(round(qf_dist)), "option_key": 1}

if __name__ == "__main__":
    print(json.dumps(solve()))
