import json
def solve():
    from itertools import permutations

    persons = ['P', 'Q', 'R', 'S', 'T']
    valid = []
    for perm in permutations(persons):
        pos = {p: i for i, p in enumerate(perm)}
        # T at leftmost (pos 0)
        if pos['T'] != 0:
            continue
        # Q immediately right of P
        if pos['Q'] != pos['P'] + 1:
            continue
        # R not adjacent to S
        if abs(pos['R'] - pos['S']) == 1:
            continue
        # S to the left of Q
        if pos['S'] >= pos['Q']:
            continue
        valid.append(perm)

    assert len(valid) == 1, f"Expected 1 solution, got {len(valid)}: {valid}"
    arrangement = valid[0]
    second_from_right = arrangement[3]  # position index 3 (4th seat) in 5-seat row

    option_map = {'Q': 1, 'P': 2, 'R': 3, 'S': 4}
    option_key = option_map[second_from_right]
    return {"value": second_from_right, "option_key": option_key}

if __name__ == "__main__":
    print(json.dumps(solve()))
