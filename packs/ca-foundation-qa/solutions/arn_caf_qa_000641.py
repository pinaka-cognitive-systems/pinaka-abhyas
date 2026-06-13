def solve():
    from itertools import permutations
    people = ['A', 'B', 'C', 'D', 'E', 'F']
    valid = []
    for perm in permutations(people):
        pos = {p: i+1 for i, p in enumerate(perm)}
        # B second from left
        if pos['B'] != 2:
            continue
        # D immediately right of B
        if pos['D'] != pos['B'] + 1:
            continue
        # A at rightmost end
        if pos['A'] != 6:
            continue
        # E and F are neighbours
        if abs(pos['E'] - pos['F']) != 1:
            continue
        # C not adjacent to A
        if abs(pos['C'] - pos['A']) == 1:
            continue
        # E not adjacent to D
        if abs(pos['E'] - pos['D']) == 1:
            continue
        valid.append(perm)

    assert len(valid) == 1, f"Expected unique solution, got {len(valid)}: {valid}"
    perm = valid[0]
    extreme_left = perm[0]
    option_map = {'C': 1, 'E': 2, 'F': 3, 'D': 4}
    return {"value": extreme_left, "option_key": option_map[extreme_left]}

if __name__ == "__main__":
    print(solve())
