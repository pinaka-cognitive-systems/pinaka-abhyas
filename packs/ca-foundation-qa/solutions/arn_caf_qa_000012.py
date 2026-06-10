"""Executable solution for arn_caf_qa_000012.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=20 km from O  2=8 km West of O  3=10 km from O  4=8 km East of O

Priya starts at O facing North.
  Walk 6 km North -> (0, 6).
  Turn right (East). Walk 8 km East -> (8, 6).
  Turn right (South). Walk 6 km South -> (8, 0).
  Distance from O = 8 km, direction = East.
"""

import math


def solve():
    x, y = 0, 0
    heading = (0, 1)  # North

    def turn_right(h):
        dx, dy = h
        return (dy, -dx)

    # Walk 6 km North
    x += heading[0] * 6
    y += heading[1] * 6

    # Turn right -> East
    heading = turn_right(heading)

    # Walk 8 km East
    x += heading[0] * 8
    y += heading[1] * 8

    # Turn right -> South
    heading = turn_right(heading)

    # Walk 6 km South
    x += heading[0] * 6
    y += heading[1] * 6

    # Final: (8, 0)
    distance = math.sqrt(x ** 2 + y ** 2)  # 8
    assert distance == 8 and x > 0 and y == 0  # due East

    direction_and_distance = "8 km, to the East of O"

    # option 4 = "8 km, to the East of O"
    option_key = 4
    return {"value": distance, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
