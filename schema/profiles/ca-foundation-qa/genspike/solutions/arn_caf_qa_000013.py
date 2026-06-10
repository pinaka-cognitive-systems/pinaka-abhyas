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


def solve():
    people = ["Ajay", "Birju", "Chhaya", "Dhruv", "Esha"]
    seats = [1, 2, 3, 4, 5]

    valid_arrangements = []

    for perm in permutations(people):
        assignment = dict(zip(seats, perm))

        # Clue 1: Esha at seat 5
        if assignment[5] != "Esha":
            continue

        # Clue 2: Birju, Chhaya, Dhruv consecutive in that left-to-right order
        pos = {person: s for s, person in assignment.items()}
        if not (pos["Birju"] + 1 == pos["Chhaya"] and pos["Chhaya"] + 1 == pos["Dhruv"]):
            continue

        # Clue 3: Ajay not in seats 3, 4, 5
        if pos["Ajay"] in {3, 4, 5}:
            continue

        valid_arrangements.append(assignment)

    assert len(valid_arrangements) == 1, f"Expected unique solution, got {valid_arrangements}"
    arrangement = valid_arrangements[0]
    person_at_seat_4 = arrangement[4]

    assert person_at_seat_4 == "Dhruv"

    # option 1 = Dhruv
    option_key = 1
    return {"value": person_at_seat_4, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
