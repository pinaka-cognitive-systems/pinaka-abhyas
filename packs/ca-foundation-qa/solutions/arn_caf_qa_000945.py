from itertools import permutations


def solve():
    people = ["A", "B", "C", "D", "E", "F"]
    valid = []
    for perm in permutations(people):
        pos = {p: i + 1 for i, p in enumerate(perm)}  # seats 1..6
        # ABC consecutive with B in the middle of the trio
        t1 = sorted([pos["A"], pos["B"], pos["C"]])
        if t1[2] - t1[0] != 2 or pos["B"] != t1[1]:
            continue
        # DEF consecutive with E in the middle of the trio
        t2 = sorted([pos["D"], pos["E"], pos["F"]])
        if t2[2] - t2[0] != 2 or pos["E"] != t2[1]:
            continue
        # F at an end
        if pos["F"] not in (1, 6):
            continue
        # C to the left of A
        if pos["C"] >= pos["A"]:
            continue
        # E not adjacent to C
        if abs(pos["E"] - pos["C"]) == 1:
            continue
        # A not adjacent to D
        if abs(pos["A"] - pos["D"]) == 1:
            continue
        valid.append(perm)
    assert len(valid) == 1, "expected a unique seating"
    row = valid[0]
    seat_of_c = row.index("C")  # 0-based
    left_of_c = row[seat_of_c - 1]
    assert left_of_c == "D"
    option_for = {"D": 1, "E": 2, "B": 3, "F": 4}
    return {"value": left_of_c, "option_key": option_for[left_of_c]}


if __name__ == "__main__":
    print(solve())
