def solve():
    # Deepak: 10E, 6N, 10W, 8S
    x, y = 0, 0
    x += 10   # East
    y += 6    # North
    x -= 10   # West
    y -= 8    # South
    # Net: x=0, y=-2 (2 km South)
    assert x == 0 and y == -2
    distance = abs(y)
    assert distance == 2
    # 2 km South = option 1
    return {"value": distance, "option_key": 1}

if __name__ == "__main__":
    print(solve())
