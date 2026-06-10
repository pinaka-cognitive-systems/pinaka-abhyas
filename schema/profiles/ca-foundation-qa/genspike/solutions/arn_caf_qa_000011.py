"""Executable solution for arn_caf_qa_000011.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=North-East  2=North  3=North-West  4=South-East

Direction problem: Vikram starts at O facing North.
  Move 1: 4 km North.
  Turn left (now facing West). Move 2: 3 km West.
  Turn right (now facing North again). Move 3: 2 km North.
  Final position relative to O -> determine compass quadrant.
"""


def solve():
    # Coordinate system: x = East positive, y = North positive.
    x, y = 0, 0

    # Heading encoded as (dx, dy) unit vector.
    # North=(0,1), East=(1,0), South=(0,-1), West=(-1,0).
    heading = (0, 1)  # facing North

    def turn_left(h):
        """90-degree counter-clockwise rotation."""
        dx, dy = h
        return (-dy, dx)

    def turn_right(h):
        """90-degree clockwise rotation."""
        dx, dy = h
        return (dy, -dx)

    # Step 1: walk 4 km North
    x += heading[0] * 4
    y += heading[1] * 4

    # Turn left
    heading = turn_left(heading)

    # Step 2: walk 3 km (now West)
    x += heading[0] * 3
    y += heading[1] * 3

    # Turn right
    heading = turn_right(heading)

    # Step 3: walk 2 km (now North again)
    x += heading[0] * 2
    y += heading[1] * 2

    # Final position: x=-3, y=6  -> West and North of O -> North-West
    assert x == -3 and y == 6

    direction = "North-West"

    # option 3 = North-West
    option_key = 3
    return {"value": direction, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
