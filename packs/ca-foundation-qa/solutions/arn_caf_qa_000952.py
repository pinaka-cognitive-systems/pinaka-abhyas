import math


def solve():
    # east = +x, north = +y; heading in degrees, 0 = East, 90 = North.
    heading = 90  # facing North
    x, y = 0.0, 0.0

    def step(x, y, h, d):
        r = math.radians(h)
        return round(x + d * math.cos(r), 6), round(y + d * math.sin(r), 6)

    x, y = step(x, y, heading, 6)        # walk 6 m (North)
    heading = (heading - 90) % 360       # turn right -> East
    x, y = step(x, y, heading, 5)        # walk 5 m
    heading = (heading - 90) % 360       # turn right -> South
    x, y = step(x, y, heading, 10)       # walk 10 m
    heading = (heading + 90) % 360       # turn left -> East
    x, y = step(x, y, heading, 3)        # walk 3 m
    heading = (heading + 90) % 360       # turn left -> North
    x, y = step(x, y, heading, 12)       # walk 12 m -> stop

    # Starting peg relative to the stop.
    dx = 0.0 - x
    dy = 0.0 - y
    ew = "East" if dx > 0 else ("West" if dx < 0 else "")
    ns = "North" if dy > 0 else ("South" if dy < 0 else "")
    assert ns and ew and abs(dx) == abs(dy), "expected a clean diagonal"
    direction = ns + "-" + ew
    assert direction == "South-West"

    option_for = {
        "South-West": 1,
        "North-East": 2,
        "North-West": 3,
        "South-East": 4,
    }
    return {"value": direction, "option_key": option_for[direction]}


if __name__ == "__main__":
    print(solve())
