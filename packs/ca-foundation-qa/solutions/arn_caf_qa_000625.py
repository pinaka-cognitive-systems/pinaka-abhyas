def solve():
    # Four persons: Amar, Bela, Chandan, Diya in positions 1-4
    # Amar=1, Bela=2 (immediately right of Amar)
    # Diya not at position 4 => Diya=3, Chandan=4
    # Immediately right of Diya (pos 3) = pos 4 = Chandan
    from itertools import permutations

    persons = ["Amar", "Bela", "Chandan", "Diya"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        # Amar at leftmost
        if pos["Amar"] != 1:
            continue
        # Bela immediately right of Amar
        if pos["Bela"] != pos["Amar"] + 1:
            continue
        # Diya not at rightmost
        if pos["Diya"] == 4:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}"
    pos = valid[0]
    # Who is immediately right of Diya?
    diya_pos = pos["Diya"]
    right_neighbor = [p for p, v in pos.items() if v == diya_pos + 1][0]
    # Map to option keys: 1=Amar, 2=Bela, 3=Chandan, 4=Diya
    option_map = {"Amar": 1, "Bela": 2, "Chandan": 3, "Diya": 4}
    return {"value": option_map[right_neighbor], "option_key": option_map[right_neighbor]}

if __name__ == "__main__":
    print(solve())
