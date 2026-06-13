import json
def solve():
    from itertools import permutations

    persons = ['P', 'Q', 'R', 'S', 'T']
    valid = []
    for perm in permutations(persons):
        pos = {p: i for i, p in enumerate(perm)}
        # R at leftmost (pos 0)
        if pos['R'] != 0:
            continue
        # Q immediately right of P
        if pos['Q'] != pos['P'] + 1:
            continue
        # S immediately right of Q
        if pos['S'] != pos['Q'] + 1:
            continue
        # T at rightmost (pos 4)
        if pos['T'] != 4:
            continue
        valid.append(perm)

    assert len(valid) == 1, f"Expected 1 solution, got {len(valid)}: {valid}"
    arrangement = valid[0]
    middle = arrangement[2]

    option_map = {'Q': 1, 'P': 2, 'S': 3, 'R': 4}
    option_key = option_map[middle]
    return {"value": middle, "option_key": option_key}

if __name__ == "__main__":
    print(json.dumps(solve()))
