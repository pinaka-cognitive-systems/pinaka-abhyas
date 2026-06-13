from itertools import permutations


def solve():
    # Six people P Q R S T U sit in a single row of six seats, facing north.
    # "X is between Y and Z" means X is directly between them, one on each
    # immediate side (Y X Z or Z X Y): a rigid 3-person block.
    people = ["P", "Q", "R", "S", "T", "U"]

    def adjacent(pos, a, b):
        return abs(pos[a] - pos[b]) == 1

    def between(pos, mid, x, y):
        return (pos[x] == pos[mid] - 1 and pos[y] == pos[mid] + 1) or (
            pos[y] == pos[mid] - 1 and pos[x] == pos[mid] + 1
        )

    def ok(p):
        pos = {person: i + 1 for i, person in enumerate(p)}
        # Block 1: Q is between P and R.
        if not between(pos, "Q", "P", "R"):
            return False
        # Block 2: T is between S and U.
        if not between(pos, "T", "S", "U"):
            return False
        # C1: P is not adjacent to S.
        if adjacent(pos, "P", "S"):
            return False
        # C2: R is not adjacent to U.
        if adjacent(pos, "R", "U"):
            return False
        # C3: P sits somewhere to the left of T.
        if pos["P"] >= pos["T"]:
            return False
        # C4: U does not sit at either end of the row.
        if pos["U"] in (1, 6):
            return False
        return True

    sols = [p for p in permutations(people) if ok(p)]
    assert len(sols) == 1, f"expected unique arrangement, got {len(sols)}"
    arr = sols[0]  # ('R','Q','P','U','T','S'); seats 1..6 left to right

    # Question: who occupies seat 4 (counting from the left)?
    answer = arr[3]
    options = {1: "T", 2: "S", 3: "U", 4: "Q"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
