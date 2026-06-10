"""Executable solution for arn_caf_qa_000184.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=West  2=East  3=North  4=South

Direction puzzle.
  Start: facing North.
  Step 1: turn CW 90 degrees -> face East; walk 8 m east.
  Step 2: turn ACW 90 degrees -> face North; walk 6 m north.
  Step 3: turn 180 degrees -> face South.
  Question: final facing direction.
"""

# Represent compass directions as angles from north (degrees, clockwise).
# N=0, E=90, S=180, W=270.
DIRECTION_ANGLE = {"N": 0, "E": 90, "S": 180, "W": 270}
ANGLE_DIRECTION = {v: k for k, v in DIRECTION_ANGLE.items()}
FULL_NAME = {"N": "North", "E": "East", "S": "South", "W": "West"}

OPTION_MAP = {"West": 1, "East": 2, "North": 3, "South": 4}
KEYED_ANSWER = "South"
option_key = 1


def _apply_turns(start_dir: str, turns: list) -> str:
    """Apply a list of turn degrees (positive = CW, negative = ACW) to start_dir.

    Returns the final direction abbreviation.
    """
    angle = DIRECTION_ANGLE[start_dir]
    for turn in turns:
        angle = (angle + turn) % 360
    return ANGLE_DIRECTION[angle]


def _simulate():
    """Walk through every turn described in the stem."""
    turns = [
        +90,   # CW 90 degrees
        -90,   # ACW 90 degrees
        +180,  # 180 degrees (same for CW or ACW)
    ]
    return _apply_turns("N", turns)


def solve():
    direction_abbr = _simulate()
    direction_full = FULL_NAME[direction_abbr]
    assert direction_full == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {direction_full}"
    return {"value": direction_full, "option_key": option_key}


def check_consistency():
    """Enumerate the turn sequence and confirm satisfiability and uniqueness.

    satisfiable: the turn sequence produces a valid direction.
    unique: exactly one direction results from the stated turns.
    """
    direction_abbr = _simulate()
    direction_full = FULL_NAME[direction_abbr]
    satisfiable = direction_full in OPTION_MAP
    unique = direction_full == KEYED_ANSWER
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
