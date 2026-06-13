from itertools import permutations


def solve():
    # 8 people A B C D E F G H sit in a row of 8 seats numbered 1..8 left to right.
    # "X is k-th to the left of Y" means position(X) = position(Y) - k.
    people = ["A", "B", "C", "D", "E", "F", "G", "H"]

    def ok(p):
        pos = {person: i + 1 for i, person in enumerate(p)}
        # Clue 1: D is fourth to the left of A  -> pos[D] = pos[A] - 4
        if pos["D"] != pos["A"] - 4:
            return False
        # Clue 2: C is third to the right of D  -> pos[C] = pos[D] + 3
        if pos["C"] != pos["D"] + 3:
            return False
        # Clue 3: F sits at one of the two ends.
        if pos["F"] not in (1, 8):
            return False
        # Clue 4: B is an immediate neighbour of A.
        if abs(pos["B"] - pos["A"]) != 1:
            return False
        # Clue 5: E sits immediately to the right of G  -> pos[E] = pos[G] + 1
        if pos["E"] != pos["G"] + 1:
            return False
        # Clue 6: H does not sit at either end.
        if pos["H"] in (1, 8):
            return False
        # Clue 7: B also sits at one of the two ends.
        if pos["B"] not in (1, 8):
            return False
        return True

    sols = [p for p in permutations(people) if ok(p)]
    assert len(sols) == 1, f"expected unique arrangement, got {len(sols)}"
    arr = sols[0]  # ('F','H','D','G','E','C','A','B'); positions 1..8 left to right
    pos = {person: i + 1 for i, person in enumerate(arr)}

    # Question: who sits third from the RIGHT end (position 8 - 3 + 1 = 6)?
    answer = arr[5]
    options = {1: "A", 2: "C", 3: "G", 4: "E"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
