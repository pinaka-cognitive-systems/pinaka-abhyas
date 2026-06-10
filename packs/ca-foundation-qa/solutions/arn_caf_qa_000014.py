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


def solve():
    people = ["A", "B", "C", "D", "E"]
    seats = [1, 2, 3, 4, 5]

    valid_arrangements = []

    for perm in permutations(people):
        assignment = dict(zip(seats, perm))
        pos = {person: s for s, person in assignment.items()}

        # Clue 1: C at seat 3
        if pos["C"] != 3:
            continue

        # Clue 3: D at seat 4
        if pos["D"] != 4:
            continue

        # Clue 2: A immediately left of B
        if pos["A"] + 1 != pos["B"]:
            continue

        # Clue 4: E not at seat 1
        if pos["E"] == 1:
            continue

        valid_arrangements.append(assignment)

    assert len(valid_arrangements) == 1, f"Expected unique solution, got {valid_arrangements}"
    arrangement = valid_arrangements[0]
    person_at_seat_2 = arrangement[2]

    assert person_at_seat_2 == "B"

    # option 2 = B
    option_key = 2
    return {"value": person_at_seat_2, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
