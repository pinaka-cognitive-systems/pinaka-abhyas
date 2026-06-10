"""Executable solution for arn_caf_qa_000014.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=A  2=B  3=C  4=E

Seating puzzle: seats 1-5 (left to right).
  People: A, B, C, D, E.
  Clue 1: C at seat 3.
  Clue 2: A is immediately to the left of B (A at seat k, B at seat k+1).
  Clue 3: D at seat 4.
  Clue 4: E does not sit at seat 1.
  Question: who sits at seat 2?
"""

from itertools import permutations

PEOPLE = ["A", "B", "C", "D", "E"]
SEATS = [1, 2, 3, 4, 5]
QUERIED_SEAT = 2
KEYED_ANSWER = "B"  # option 2


def _enumerate_valid():
    """Brute-force the full permutation space, keeping arrangements that satisfy
    every clue. Returns the list of all valid seat -> person assignments."""
    valid = []
    for perm in permutations(PEOPLE):
        assignment = dict(zip(SEATS, perm))
        pos = {person: s for s, person in assignment.items()}

        # Clue 1: C at seat 3.
        if pos["C"] != 3:
            continue
        # Clue 3: D at seat 4.
        if pos["D"] != 4:
            continue
        # Clue 2: A immediately left of B.
        if pos["A"] + 1 != pos["B"]:
            continue
        # Clue 4: E not at seat 1.
        if pos["E"] == 1:
            continue
        valid.append(assignment)
    return valid


def solve():
    valid_arrangements = _enumerate_valid()
    assert len(valid_arrangements) == 1, f"Expected unique solution, got {valid_arrangements}"
    person_at_seat_2 = valid_arrangements[0][QUERIED_SEAT]
    assert person_at_seat_2 == KEYED_ANSWER

    # option 2 = B
    option_key = 2
    return {"value": person_at_seat_2, "option_key": option_key}


def check_consistency():
    """Enumerate the constraint space and report whether the premises are
    satisfiable and the keyed answer (occupant of the queried seat) is unique.

    satisfiable: at least one arrangement satisfies every clue.
    unique: every satisfying arrangement puts the same person in the queried seat,
            and that person is the keyed answer.
    """
    valid = _enumerate_valid()
    satisfiable = len(valid) > 0
    occupants = {a[QUERIED_SEAT] for a in valid}
    unique = len(occupants) == 1 and occupants == {KEYED_ANSWER}
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
