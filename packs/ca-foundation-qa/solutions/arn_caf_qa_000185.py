"""Executable solution for arn_caf_qa_000185.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Dev  2=Anil  3=Beena  4=Charu

Seating puzzle: 4 seats (1=leftmost, 4=rightmost).
  People: Anil, Beena, Charu, Dev.
  Clue 1: Beena sits immediately to the right of Anil (Beena = Anil + 1).
  Clue 2: Dev does not sit at seat 1 or seat 4.
  Clue 3: Charu sits at seat 1.
  Question: who sits at seat 3?
"""

from itertools import permutations

PEOPLE = ["Anil", "Beena", "Charu", "Dev"]
SEATS = [1, 2, 3, 4]
QUERIED_SEAT = 3
KEYED_ANSWER = "Anil"
option_key = 3


def _enumerate_valid():
    """Brute-force all permutations satisfying every clue."""
    valid = []
    for perm in permutations(PEOPLE):
        assignment = dict(zip(SEATS, perm))
        pos = {person: s for s, person in assignment.items()}

        # Clue 1: Beena immediately to the right of Anil.
        if pos["Beena"] != pos["Anil"] + 1:
            continue
        # Clue 2: Dev not at seat 1 or 4.
        if pos["Dev"] in {1, 4}:
            continue
        # Clue 3: Charu at seat 1.
        if pos["Charu"] != 1:
            continue
        valid.append(assignment)
    return valid


def solve():
    valid_arrangements = _enumerate_valid()
    assert len(valid_arrangements) == 1, f"Expected unique solution, got {valid_arrangements}"
    person_at_seat = valid_arrangements[0][QUERIED_SEAT]
    assert person_at_seat == KEYED_ANSWER
    return {"value": person_at_seat, "option_key": option_key}


def check_consistency():
    """Enumerate the constraint space and report satisfiability and uniqueness."""
    valid = _enumerate_valid()
    satisfiable = len(valid) > 0
    occupants = {a[QUERIED_SEAT] for a in valid}
    unique = len(occupants) == 1 and occupants == {KEYED_ANSWER}
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
