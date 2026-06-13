def solve():
    from itertools import permutations
    people = ['P', 'Q', 'R', 'S', 'T', 'U']
    valid = []
    for perm in permutations(people):
        pos = {p: i+1 for i, p in enumerate(perm)}  # 1-indexed positions
        # P sits third from left
        if pos['P'] != 3:
            continue
        # Q immediately right of P
        if pos['Q'] != pos['P'] + 1:
            continue
        # R at one of the ends
        if pos['R'] not in (1, 6):
            continue
        # U immediately left of R
        if pos['U'] != pos['R'] - 1:
            continue
        # T between S and U (positionally)
        if not (pos['S'] < pos['T'] < pos['U'] or pos['U'] < pos['T'] < pos['S']):
            continue
        # S not adjacent to R
        if abs(pos['S'] - pos['R']) == 1:
            continue
        valid.append(perm)

    assert len(valid) == 1, f"Expected unique solution, got {len(valid)}"
    perm = valid[0]
    # second from right = position 5 (index 4)
    second_from_right = perm[4]
    option_map = {'T': 1, 'S': 2, 'Q': 3, 'U': 4}
    return {"value": second_from_right, "option_key": option_map[second_from_right]}

if __name__ == "__main__":
    print(solve())
