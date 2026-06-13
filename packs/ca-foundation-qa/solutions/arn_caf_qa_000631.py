def solve():
    # Six persons: Gaurav, Hina, Irfan, Jalpa, Kunal, Leena in positions 1-6
    # Gaurav=3, Hina=6
    # Irfan immediately right of Jalpa
    # Leena not adjacent to Gaurav
    # Kunal not at position 1
    # Jalpa not at position 1
    # Find: who is at position 2?
    from itertools import permutations

    persons = ["Gaurav", "Hina", "Irfan", "Jalpa", "Kunal", "Leena"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Gaurav"] != 3:
            continue
        if pos["Hina"] != 6:
            continue
        # Irfan immediately right of Jalpa
        if pos["Irfan"] != pos["Jalpa"] + 1:
            continue
        # Leena not adjacent to Gaurav
        if abs(pos["Leena"] - pos["Gaurav"]) == 1:
            continue
        # Kunal not at position 1
        if pos["Kunal"] == 1:
            continue
        # Jalpa not at position 1
        if pos["Jalpa"] == 1:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_2 = seat_to_person[2]
    # Options: 1=Gaurav, 2=Irfan, 3=Kunal, 4=Leena
    item_option_map = {"Gaurav": 1, "Irfan": 2, "Kunal": 3, "Leena": 4}
    return {"value": item_option_map[person_at_2], "option_key": item_option_map[person_at_2]}

if __name__ == "__main__":
    print(solve())
