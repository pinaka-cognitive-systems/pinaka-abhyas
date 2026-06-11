"""Executable solution for arn_caf_qa_000206.

Contract: solve() returns {"value": <answer text>, "option_key": <int>}.
LR item: check_consistency() returns {"satisfiable": True, "unique": True}.

Options: 1=East  2=West  3=North  4=South

Kavya starts at P facing North.
Leg 1: walk 5 m North.
Leg 2: turn right (East), walk 7 m.
Leg 3: turn right (South), walk 3 m.
Leg 4: turn right (West), walk 7 m.
Question: which direction is Kavya now facing?
"""

# Compass headings, clockwise: 0=North, 1=East, 2=South, 3=West
HEADINGS = ["North", "East", "South", "West"]
HEADING_TO_OPTION = {"North": 3, "East": 1, "South": 4, "West": 2}

ROUTE = [
    # (turn, distance_m)
    # Each entry is (turn_steps_clockwise, distance): 1=right, -1=left, 0=straight
    (0, 5),    # start facing North, walk 5 m
    (1, 7),    # turn right -> East, walk 7 m
    (1, 3),    # turn right -> South, walk 3 m
    (1, 7),    # turn right -> West, walk 7 m
]

CORRECT_FACING = "West"
CORRECT_OPTION = 2


def _simulate():
    """Simulate the route and return final facing direction."""
    facing_index = 0  # North
    x, y = 0, 0  # x = East-West (positive = East), y = North-South (positive = North)
    dx = [0, 1, 0, -1]
    dy = [1, 0, -1, 0]
    first = True
    for turn_steps, distance in ROUTE:
        if first:
            first = False
        else:
            facing_index = (facing_index + turn_steps) % 4
        x += dx[facing_index] * distance
        y += dy[facing_index] * distance
    return HEADINGS[facing_index], x, y


def solve():
    facing, x, y = _simulate()
    assert facing == CORRECT_FACING, f"Expected {CORRECT_FACING}, got {facing}"
    return {"value": facing, "option_key": CORRECT_OPTION}


def check_consistency():
    """Direction-test item: the route is deterministic, so it is trivially satisfiable
    and unique. Enumerate by confirming only one outcome is possible."""
    facing, x, y = _simulate()
    satisfiable = True                     # route has a valid execution
    unique = (facing == CORRECT_FACING)    # exactly one outcome
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
