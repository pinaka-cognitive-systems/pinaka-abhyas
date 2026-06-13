def solve():
    # Six persons: Aarav, Bilal, Chitra, Divya, Esha, Farhan in positions 1-6
    # Aarav=2, Farhan=5, Bilal immediately left of Chitra
    # Divya not adjacent to Esha, Esha not at position 6
    # Find: who is at position 4?
    from itertools import permutations

    persons = ["Aarav", "Bilal", "Chitra", "Divya", "Esha", "Farhan"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Aarav"] != 2:
            continue
        if pos["Farhan"] != 5:
            continue
        if pos["Chitra"] != pos["Bilal"] + 1:
            continue
        if abs(pos["Divya"] - pos["Esha"]) == 1:
            continue
        if pos["Esha"] == 6:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_4 = seat_to_person[4]
    # Options: 1=Aarav, 2=Bilal, 3=Chitra, 4=Divya
    item_option_map = {"Aarav": 1, "Bilal": 2, "Chitra": 3, "Divya": 4}
    return {"value": item_option_map[person_at_4], "option_key": item_option_map[person_at_4]}

if __name__ == "__main__":
    print(solve())
