import json
def solve():
    from itertools import permutations

    persons = ['P', 'Q', 'R', 'S', 'T']
    n = 5
    valid = []

    # Fix P at position 0 (clockwise: 0,1,2,3,4)
    others = ['Q', 'R', 'S', 'T']
    for perm in permutations(others):
        arrangement = ['P'] + list(perm)
        pos = {arrangement[i]: i for i in range(n)}

        def right_of(x):
            return arrangement[(pos[x] + 1) % n]

        def left_of(x):
            return arrangement[(pos[x] - 1) % n]

        def adjacent(x, y):
            diff = abs(pos[x] - pos[y])
            return diff == 1 or diff == n - 1  # circular adjacency

        # C1: Q immediately right of P
        if right_of('P') != 'Q':
            continue
        # C2: S immediately right of R
        if right_of('R') != 'S':
            continue
        # C3: T not adjacent to P
        if adjacent('T', 'P'):
            continue

        valid.append(arrangement[:])

    assert len(valid) == 1, f"Expected 1 solution, got {len(valid)}: {valid}"
    arrangement = valid[0]
    pos = {arrangement[i]: i for i in range(n)}

    # Who is immediately to the LEFT of T?
    left_of_T = arrangement[(pos['T'] - 1) % n]

    option_map = {'Q': 1, 'P': 2, 'R': 3, 'S': 4}
    option_key = option_map[left_of_T]
    return {"value": left_of_T, "option_key": option_key}

if __name__ == "__main__":
    print(json.dumps(solve()))
