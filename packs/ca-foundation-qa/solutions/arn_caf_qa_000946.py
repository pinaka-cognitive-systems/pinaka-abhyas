from itertools import permutations


def solve():
    people = ["A", "B", "C", "D", "E", "F", "G", "H"]
    valid = []
    for perm in permutations(people):
        pos = {p: i + 1 for i, p in enumerate(perm)}  # seats 1..8
        if pos["A"] != pos["D"] + 4:
            continue
        if pos["B"] != pos["D"] + 1:
            continue
        if pos["C"] != pos["A"] + 1:
            continue
        if pos["E"] not in (1, 8):
            continue
        if abs(pos["E"] - pos["D"]) != 2:
            continue
        if pos["F"] != pos["E"] + 1:
            continue
        if pos["G"] != pos["A"] - 1:
            continue
        if pos["H"] <= pos["D"]:
            continue
        valid.append(perm)
    assert len(valid) == 1, "expected a unique seating"
    row = valid[0]
    seat6 = row[5]
    assert seat6 == "G"
    option_for = {"G": 1, "H": 2, "B": 3, "A": 4}
    return {"value": seat6, "option_key": option_for[seat6]}


if __name__ == "__main__":
    print(solve())
