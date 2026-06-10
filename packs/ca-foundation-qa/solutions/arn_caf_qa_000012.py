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

# The walk as a sequence of (turn, distance). turn is "right"/"left"/None.
WALK = [(None, 6), ("right", 8), ("right", 6)]
START_HEADING = (0, 1)  # North; x = East positive, y = North positive.
KEYED_OPTION = 4  # "8 km, to the East of O"

# The four option descriptions, each as a structured predicate over the endpoint.
# distance: required straight-line distance from O (or None if the option omits it).
# direction: required compass cell as (sign_x, sign_y) (or None if omitted).
OPTIONS = {
    1: {"distance": 20, "direction": None},          # "20 km from O"
    2: {"distance": 8, "direction": (-1, 0)},        # "8 km, to the West of O"
    3: {"distance": 10, "direction": None},          # "10 km from O"
    4: {"distance": 8, "direction": (1, 0)},         # "8 km, to the East of O"
}


def _turn_right(h):
    dx, dy = h
    return (dy, -dx)


def _turn_left(h):
    dx, dy = h
    return (-dy, dx)


def _walk_endpoint():
    """Simulate the walk literally; return the (x, y) endpoint relative to O."""
    x, y = 0, 0
    heading = START_HEADING
    for turn, dist in WALK:
        if turn == "right":
            heading = _turn_right(heading)
        elif turn == "left":
            heading = _turn_left(heading)
        x += heading[0] * dist
        y += heading[1] * dist
    return x, y


def _sign(v):
    return (v > 0) - (v < 0)


def _option_matches(opt, x, y):
    """True if the option description is fully consistent with the endpoint (x, y)."""
    distance = math.sqrt(x ** 2 + y ** 2)
    if opt["distance"] is not None and not math.isclose(distance, opt["distance"]):
        return False
    if opt["direction"] is not None and (_sign(x), _sign(y)) != opt["direction"]:
        return False
    return True


def solve():
    x, y = _walk_endpoint()
    # Final: (8, 0) -> 8 km due East of O.
    distance = math.sqrt(x ** 2 + y ** 2)  # 8
    assert distance == 8 and x > 0 and y == 0  # due East

    # option 4 = "8 km, to the East of O"
    option_key = 4
    return {"value": distance, "option_key": option_key}


def check_consistency():
    """Test every option description against the simulated endpoint and report
    whether the answer is well-defined (satisfiable) and uniquely determined.

    satisfiable: the endpoint is not the origin, so a position relative to O exists.
    unique: exactly one option fully describes the endpoint, and it is the keyed option.
            An option that states only a distance (no direction) still counts as a
            match if that distance is right, so this also catches a distractor that
            happens to share the correct distance.
    """
    x, y = _walk_endpoint()
    satisfiable = (x, y) != (0, 0)
    matching = [k for k, opt in OPTIONS.items() if _option_matches(opt, x, y)]
    unique = matching == [KEYED_OPTION]
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
