"""Executable solution for arn_caf_qa_000188.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=S  2=U  3=T  4=Q

Seating puzzle: 6 seats (1=leftmost, 6=rightmost).
  People: P, Q, R, S, T, U.
  Clue 1: P sits at seat 1.
  Clue 2: Q sits immediately to the right of P (Q = P+1).
  Clue 3: R sits at seat 4.
  Clue 4: S does not sit at seat 6.
  Clue 5: T sits immediately to the right of R (T = R+1 = 5).
  Question: who sits at seat 6?
"""

from itertools import permutations

PEOPLE = ["P", "Q", "R", "S", "T", "U"]
SEATS = [1, 2, 3, 4, 5, 6]
QUERIED_SEAT = 6
KEYED_ANSWER = "U"
option_key = 4


def _enumerate_valid():
    """Brute-force all permutations satisfying every clue."""
    valid = []
    for perm in permutations(PEOPLE):
        assignment = dict(zip(SEATS, perm))
        pos = {person: s for s, person in assignment.items()}

        # Clue 1: P at seat 1.
        if pos["P"] != 1:
            continue
        # Clue 2: Q immediately to the right of P.
        if pos["Q"] != pos["P"] + 1:
            continue
        # Clue 3: R at seat 4.
        if pos["R"] != 4:
            continue
        # Clue 4: S not at seat 6.
        if pos["S"] == 6:
            continue
        # Clue 5: T immediately to the right of R.
        if pos["T"] != pos["R"] + 1:
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
