"""Executable solution for arn_caf_qa_000011.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=North-East  2=North  3=North-West  4=South-East

Direction problem: Vikram starts at O facing North.
  Move 1: 4 km North.
  Turn left (now facing West). Move 2: 3 km West.
  Turn right (now facing North again). Move 3: 2 km North.
  Final position relative to O -> determine compass quadrant.
"""


# The walk as a sequence of (turn, distance). turn is one of "left"/"right"/None.
WALK = [(None, 4), ("left", 3), ("right", 2)]
START_HEADING = (0, 1)  # facing North; x = East positive, y = North positive.
KEYED_ANSWER = "North-West"  # option 3

# The eight compass classifications over the sign of (x, y) relative to O.
# Keyed on (sign(x), sign(y)) with x=East positive, y=North positive.
COMPASS = {
    (0, 1): "North",
    (0, -1): "South",
    (1, 0): "East",
    (-1, 0): "West",
    (1, 1): "North-East",
    (-1, 1): "North-West",
    (1, -1): "South-East",
    (-1, -1): "South-West",
}


def _turn_left(h):
    """90-degree counter-clockwise rotation."""
    dx, dy = h
    return (-dy, dx)


def _turn_right(h):
    """90-degree clockwise rotation."""
    dx, dy = h
    return (dy, -dx)


def _walk_endpoint():
    """Simulate the walk literally; return the (x, y) endpoint relative to O."""
    x, y = 0, 0
    heading = START_HEADING
    for turn, dist in WALK:
        if turn == "left":
            heading = _turn_left(heading)
        elif turn == "right":
            heading = _turn_right(heading)
        x += heading[0] * dist
        y += heading[1] * dist
    return x, y


def solve():
    x, y = _walk_endpoint()
    # Final position: x=-3, y=6 -> West and North of O -> North-West.
    assert x == -3 and y == 6
    direction = COMPASS[(_sign(x), _sign(y))]
    assert direction == KEYED_ANSWER

    # option 3 = North-West
    option_key = 3
    return {"value": direction, "option_key": option_key}


def _sign(v):
    return (v > 0) - (v < 0)


def check_consistency():
    """Classify the walk endpoint against the eight compass directions and report
    whether the answer is well-defined (satisfiable) and uniquely determined.

    satisfiable: the endpoint is not the origin and maps to a defined compass cell.
    unique: exactly one of the eight compass directions matches the endpoint, and it
            is the keyed answer.
    """
    x, y = _walk_endpoint()
    cell = (_sign(x), _sign(y))
    satisfiable = cell != (0, 0) and cell in COMPASS
    matches = [name for sign, name in COMPASS.items() if sign == cell]
    unique = len(matches) == 1 and matches[0] == KEYED_ANSWER
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
