from itertools import permutations


def solve():
    # Seven friends L M N O P Q R sit in a row of seven seats numbered 1..7
    # from the left, all facing north.
    people = ["L", "M", "N", "O", "P", "Q", "R"]

    def ok(p):
        pos = {person: i + 1 for i, person in enumerate(p)}
        # C1: L is third to the left of Q.
        if pos["L"] != pos["Q"] - 3:
            return False
        # C2: M sits immediately to the right of L.
        if pos["M"] != pos["L"] + 1:
            return False
        # C3: N and O are immediate neighbours of each other.
        if abs(pos["N"] - pos["O"]) != 1:
            return False
        # C4: R sits at one of the two ends.
        if pos["R"] not in (1, 7):
            return False
        # C5: P does not sit at either end.
        if pos["P"] in (1, 7):
            return False
        # C6: O sits somewhere to the right of Q.
        if pos["O"] <= pos["Q"]:
            return False
        # C7: N sits immediately to the right of Q.
        if pos["N"] != pos["Q"] + 1:
            return False
        # C8: L sits at the extreme left end (seat 1).
        if pos["L"] != 1:
            return False
        return True

    sols = [p for p in permutations(people) if ok(p)]
    assert len(sols) == 1, f"expected unique arrangement, got {len(sols)}"
    arr = sols[0]  # ('L','M','P','Q','N','O','R'); seats 1..7 left to right
    pos = {person: i + 1 for i, person in enumerate(arr)}

    # Question: who is the immediate left neighbour of Q?
    answer = arr[pos["Q"] - 2]
    options = {1: "R", 2: "P", 3: "N", 4: "L"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
