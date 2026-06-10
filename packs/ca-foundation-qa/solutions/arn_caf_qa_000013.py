"""Executable solution for arn_caf_qa_000013.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Dhruv  2=Ajay  3=Chhaya  4=Birju

Seating puzzle: 5 seats (1=leftmost, 5=rightmost).
  People: Ajay, Birju, Chhaya, Dhruv, Esha.
  Clue 1: Esha sits at seat 5.
  Clue 2: Birju, Chhaya, Dhruv occupy consecutive seats in that order.
  Clue 3: Ajay does NOT sit in seats 3, 4, or 5.
  Question: who sits at seat 4?
"""

from itertools import permutations

PEOPLE = ["Ajay", "Birju", "Chhaya", "Dhruv", "Esha"]
SEATS = [1, 2, 3, 4, 5]
QUERIED_SEAT = 4
KEYED_ANSWER = "Dhruv"  # option 1


def _enumerate_valid():
    """Brute-force the full permutation space, keeping arrangements that satisfy
    every clue. Returns the list of all valid seat -> person assignments."""
    valid = []
    for perm in permutations(PEOPLE):
        assignment = dict(zip(SEATS, perm))
        pos = {person: s for s, person in assignment.items()}

        # Clue 1: Esha at seat 5.
        if assignment[5] != "Esha":
            continue
        # Clue 2: Birju, Chhaya, Dhruv consecutive in that left-to-right order.
        if not (pos["Birju"] + 1 == pos["Chhaya"] and pos["Chhaya"] + 1 == pos["Dhruv"]):
            continue
        # Clue 3: Ajay not in seats 3, 4, 5.
        if pos["Ajay"] in {3, 4, 5}:
            continue
        valid.append(assignment)
    return valid


def solve():
    valid_arrangements = _enumerate_valid()
    assert len(valid_arrangements) == 1, f"Expected unique solution, got {valid_arrangements}"
    person_at_seat_4 = valid_arrangements[0][QUERIED_SEAT]
    assert person_at_seat_4 == KEYED_ANSWER

    # option 1 = Dhruv
    option_key = 1
    return {"value": person_at_seat_4, "option_key": option_key}


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
