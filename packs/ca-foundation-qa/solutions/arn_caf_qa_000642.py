def solve():
    from itertools import permutations
    # Seven people M, N, O, P, Q, R, S in a row
    # M at leftmost end (pos 1)
    # N third from right (pos 5 of 7)
    # O immediately left of N (pos 4)
    # R sits immediately left of S
    # P not adjacent to M
    # Q not at either end
    # Q is to the right of N (pos > 5)
    people = ['M', 'N', 'O', 'P', 'Q', 'R', 'S']
    valid = []
    for perm in permutations(people):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos['M'] != 1:
            continue
        if pos['N'] != 5:
            continue
        if pos['O'] != 4:
            continue
        # R immediately left of S
        if pos['S'] != pos['R'] + 1:
            continue
        if abs(pos['P'] - pos['M']) == 1:
            continue
        if pos['Q'] in (1, 7):
            continue
        # Q to the right of N
        if pos['Q'] <= 5:
            continue
        valid.append(perm)

    assert len(valid) == 1, f"Expected unique, got {len(valid)}: {[list(v) for v in valid]}"
    perm = valid[0]
    third_from_left = perm[2]
    option_map = {'P': 1, 'Q': 2, 'R': 3, 'S': 4}
    return {"value": third_from_left, "option_key": option_map[third_from_left]}

if __name__ == "__main__":
    print(solve())
