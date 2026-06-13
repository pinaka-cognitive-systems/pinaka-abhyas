def solve():
    from itertools import permutations
    people = ['A', 'B', 'C', 'D', 'E']
    valid = []
    for perm in permutations(people):
        pos = {p: i+1 for i, p in enumerate(perm)}
        # C at leftmost end
        if pos['C'] != 1:
            continue
        # D immediately right of C
        if pos['D'] != pos['C'] + 1:
            continue
        # B immediately right of A
        if pos['B'] != pos['A'] + 1:
            continue
        # E at rightmost end
        if perm[4] != 'E':
            continue
        valid.append(perm)

    assert len(valid) == 1, f"Expected unique solution, got {len(valid)}: {valid}"
    perm = valid[0]
    middle = perm[2]
    option_map = {'A': 1, 'B': 2, 'D': 3, 'C': 4}
    return {"value": middle, "option_key": option_map[middle]}

if __name__ == "__main__":
    print(solve())
