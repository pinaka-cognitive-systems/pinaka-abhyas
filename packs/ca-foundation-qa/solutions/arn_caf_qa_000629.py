def solve():
    # Five persons: Kiran, Lata, Manish, Nisha, Prem in positions 1-5
    # Prem=1, Manish=5, Lata immediately left of Nisha, Kiran not at pos 2
    # Find: who is at position 4?
    from itertools import permutations

    persons = ["Kiran", "Lata", "Manish", "Nisha", "Prem"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Prem"] != 1:
            continue
        if pos["Manish"] != 5:
            continue
        # Lata immediately left of Nisha
        if pos["Nisha"] != pos["Lata"] + 1:
            continue
        # Kiran not at position 2
        if pos["Kiran"] == 2:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_4 = seat_to_person[4]
    # Options: 1=Kiran, 2=Lata, 3=Manish, 4=Nisha
    item_option_map = {"Kiran": 1, "Lata": 2, "Manish": 3, "Nisha": 4}
    return {"value": item_option_map[person_at_4], "option_key": item_option_map[person_at_4]}

if __name__ == "__main__":
    print(solve())
