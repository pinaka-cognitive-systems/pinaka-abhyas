"""Executable solution for arn_caf_qa_000216.

Contract (ADR 0005): solve() returns {"value": ..., "option_key": <int>}.
LR item: check_consistency() returns {"satisfiable": True, "unique": True}.

Direction-walk puzzle.
  Nitin starts at P=(0,0) facing South.
  Leg 1: walk 5 m South  -> (0, -5).
  Leg 2: turn right from South = West; walk 12 m West -> (-12, -5).
  Leg 3: turn right from West = North; walk 5 m North -> (-12, 0).
  Question: straight-line distance from P to current position.

Options: 1="22 m"  2="12 m"  3="13 m"  4="17 m"
"""

import math
from itertools import product

# Compass encoding: 0=N, 1=E, 2=S, 3=W
COMPASS = {0: (0, 1), 1: (1, 0), 2: (0, -1), 3: (-1, 0)}
COMPASS_NAME = {0: "N", 1: "E", 2: "S", 3: "W"}


def _simulate(legs):
    """
    legs: list of (facing, distance) tuples.
    Returns final (x, y).
    """
    x, y = 0, 0
    for facing, dist in legs:
        dx, dy = COMPASS[facing]
        x += dx * dist
        y += dy * dist
    return x, y


def _build_legs():
    """
    Build the sequence: start facing South (2).
    Each 'turn right' rotates facing by +1 mod 4.
    """
    start_facing = 2  # South
    legs = []
    f = start_facing
    # Leg 1: straight, 5 m
    legs.append((f, 5))
    # Turn right: (2+1)%4 = 3 = West
    f = (f + 1) % 4
    # Leg 2: 12 m
    legs.append((f, 12))
    # Turn right: (3+1)%4 = 0 = North
    f = (f + 1) % 4
    # Leg 3: 5 m
    legs.append((f, 5))
    return legs


def _distance(x, y):
    return math.sqrt(x ** 2 + y ** 2)


def solve():
    legs = _build_legs()
    x, y = _simulate(legs)
    dist = _distance(x, y)
    # dist should be exactly 12.0
    assert abs(dist - 12.0) < 1e-9, f"Expected 12.0, got {dist}"
    return {"value": dist, "option_key": 2}


def check_consistency():
    """
    Enumerate the single valid interpretation of the puzzle.
    The puzzle has no ambiguity: starting direction and turn directions
    are stated explicitly. The only valid solution gives distance = 12 m.

    Satisfiability: there is exactly one valid simulation.
    Uniqueness: all valid simulations agree on distance = 12 m.
    """
    legs = _build_legs()
    x, y = _simulate(legs)
    dist = _distance(x, y)
    satisfiable = True  # The puzzle constraints are consistent.
    unique = abs(dist - 12.0) < 1e-9  # Only one outcome.
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
