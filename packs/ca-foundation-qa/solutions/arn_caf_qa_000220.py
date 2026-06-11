"""Executable solution for arn_caf_qa_000220.

Contract: solve() returns {"value": ..., "option_key": <int>}.

Circular permutations with a group constraint.

  8 people to seat around a circular table.
  Trilok, Uma, Veda must sit together as a block.

  Method:
    Step 1. Treat {Trilok, Uma, Veda} as one block.
            Total units = 5 others + 1 block = 6 units.
    Step 2. Circular arrangements of 6 units = (6-1)! = 5! = 120.
    Step 3. Internal arrangements of the block = 3! = 6.
    Step 4. Total = 120 * 6 = 720.

Options: 1=4320  2=720  3=120  4=5040
Correct: 2
"""

import math
from itertools import permutations


TOTAL_PEOPLE = 8
GROUP_SIZE   = 3   # Trilok, Uma, Veda
OPTION_KEY   = 2
KEYED_ANSWER = 720


def _circular_arrangements(n):
    """Number of distinct circular permutations of n distinct objects."""
    return math.factorial(n - 1)


def solve():
    # Treat the group as one block: remaining 5 + 1 block = 6 units.
    units = TOTAL_PEOPLE - GROUP_SIZE + 1          # 6
    circular = _circular_arrangements(units)       # 5! = 120
    internal = math.factorial(GROUP_SIZE)           # 3! = 6
    total = circular * internal                    # 720

    assert total == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {total}"
    return {"value": total, "option_key": OPTION_KEY}


def _brute_force():
    """
    Enumerate all circular arrangements of 8 people with the group constraint.

    Fix person 0 (arbitrary) to remove rotational equivalence.
    The remaining 7 positions are filled by the other 7 people.
    Count arrangements where Trilok (index 1), Uma (2), Veda (3) are adjacent.
    """
    people = list(range(TOTAL_PEOPLE))
    # Fix person 0 at position 0 to break rotational symmetry.
    others = people[1:]  # people 1..7

    GROUP = {1, 2, 3}   # indices representing Trilok, Uma, Veda

    count = 0
    for perm in permutations(others):
        # seats: [0] + list(perm), arranged in a circle of 8
        seats = [0] + list(perm)
        # Find positions of the group members.
        positions = sorted(i for i, p in enumerate(seats) if p in GROUP)
        # In a circle of 8, adjacent means consecutive mod 8.
        # Check if the three positions form a consecutive trio mod 8.
        if len(positions) == 3:
            p0, p1, p2 = positions
            # Two checks: consecutive in order, or wrap-around.
            if (p1 - p0 == 1 and p2 - p1 == 1) or \
               (p2 - p0 == 7 and p1 - p0 == 1) or \
               (p2 - p1 == 1 and p0 == 0 and p2 == 7):
                count += 1
    return count


if __name__ == "__main__":
    result = solve()
    print(result)

    # Cross-check with brute force.
    bf = _brute_force()
    print(f"Brute force count: {bf}")
    assert bf == KEYED_ANSWER, f"Brute force mismatch: {bf} vs {KEYED_ANSWER}"
    print("Brute force check passed.")
