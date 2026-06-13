def solve():
    # Six persons: Arjun, Bhanu, Chitra, Dinesh, Ekta, Farha in positions 1-6
    # Arjun=1, Bhanu=6, Farha=4
    # Chitra immediately left of Dinesh
    # Ekta not adjacent to Arjun
    # Find: who is at position 5?
    from itertools import permutations

    persons = ["Arjun", "Bhanu", "Chitra", "Dinesh", "Ekta", "Farha"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Arjun"] != 1:
            continue
        if pos["Bhanu"] != 6:
            continue
        if pos["Farha"] != 4:
            continue
        # Chitra immediately left of Dinesh
        if pos["Dinesh"] != pos["Chitra"] + 1:
            continue
        # Ekta not adjacent to Arjun
        if abs(pos["Ekta"] - pos["Arjun"]) == 1:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_5 = seat_to_person[5]
    # Options: 1=Arjun, 2=Chitra, 3=Dinesh, 4=Ekta
    item_option_map = {"Arjun": 1, "Chitra": 2, "Dinesh": 3, "Ekta": 4}
    return {"value": item_option_map[person_at_5], "option_key": item_option_map[person_at_5]}

if __name__ == "__main__":
    print(solve())
