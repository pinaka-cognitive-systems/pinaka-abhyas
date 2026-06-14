from itertools import permutations


def solve():
    people = ["P", "Q", "R", "S", "T", "U", "V", "W"]
    valid = []
    for perm in permutations(people):
        pos = {p: i + 1 for i, p in enumerate(perm)}  # seats 1..8
        if pos["V"] != pos["R"] + 3:
            continue
        if pos["P"] not in (1, 8):
            continue
        if abs(pos["P"] - pos["R"]) != 2:
            continue
        if pos["S"] != pos["V"] + 1:
            continue
        if pos["Q"] <= pos["S"]:
            continue
        if abs(pos["T"] - pos["R"]) == 1:
            continue
        if pos["U"] in (1, 8):
            continue
        if pos["W"] != pos["P"] + 1:
            continue
        valid.append(perm)
    assert len(valid) == 1, "expected a unique seating"
    row = valid[0]
    seat5 = row[4]
    assert seat5 == "T"
    option_for = {"T": 1, "U": 2, "W": 3, "Q": 4}
    return {"value": seat5, "option_key": option_for[seat5]}


if __name__ == "__main__":
    print(solve())
