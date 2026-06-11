"""Executable solution for arn_caf_qa_000210.

Contract (ADR 0005): solve() returns {"value": <answer text>, "option_key": <int>}.
LR item: check_consistency() returns {"satisfiable": True, "unique": True}.

Options: 1=Gargi  2=Hetal  3=Jaya  4=Ishan

Seating puzzle: 5 seats (1=leftmost, 5=rightmost).
  People: Farhan, Gargi, Hetal, Ishan, Jaya.
  Clue 1: Farhan sits at seat 1.
  Clue 2: Gargi sits immediately to the right of Hetal (Gargi = Hetal + 1).
  Clue 3: Jaya does not sit at seat 2 or seat 3.
  Clue 4: Ishan sits at seat 5.
  Question: who sits at seat 2?
"""

from itertools import permutations

PEOPLE = ["Farhan", "Gargi", "Hetal", "Ishan", "Jaya"]
SEATS = [1, 2, 3, 4, 5]
QUERIED_SEAT = 2
KEYED_ANSWER = "Hetal"
OPTION_KEY = 2


def _enumerate_valid():
    """Brute-force all permutations satisfying every clue."""
    valid = []
    for perm in permutations(PEOPLE):
        assignment = dict(zip(SEATS, perm))
        pos = {person: s for s, person in assignment.items()}

        # Clue 1: Farhan at seat 1.
        if pos["Farhan"] != 1:
            continue
        # Clue 2: Gargi immediately to the right of Hetal.
        if pos["Gargi"] != pos["Hetal"] + 1:
            continue
        # Clue 3: Jaya not at seat 2 or seat 3.
        if pos["Jaya"] in {2, 3}:
            continue
        # Clue 4: Ishan at seat 5.
        if pos["Ishan"] != 5:
            continue
        valid.append(assignment)
    return valid


def solve():
    valid_arrangements = _enumerate_valid()
    assert len(valid_arrangements) == 1, f"Expected unique solution, got {valid_arrangements}"
    person_at_seat = valid_arrangements[0][QUERIED_SEAT]
    assert person_at_seat == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {person_at_seat}"
    return {"value": person_at_seat, "option_key": OPTION_KEY}


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
