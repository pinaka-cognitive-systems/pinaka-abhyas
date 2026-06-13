def solve():
    # Five persons: Farhan, Gauri, Hari, Isha, Jatin in positions 1-5
    # Farhan=1, Jatin=5
    # Gauri flanked by Hari and Isha as immediate neighbours
    # Hari not adjacent to Farhan
    # Find: who is at position 2?
    from itertools import permutations

    persons = ["Farhan", "Gauri", "Hari", "Isha", "Jatin"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Farhan"] != 1:
            continue
        if pos["Jatin"] != 5:
            continue
        # Gauri flanked by Hari and Isha: Hari and Isha are immediate neighbours of Gauri
        g = pos["Gauri"]
        h = pos["Hari"]
        i = pos["Isha"]
        neighbours_of_g = {g-1, g+1}
        if not ({h, i} == neighbours_of_g):
            continue
        # Hari not adjacent to Farhan
        if abs(pos["Hari"] - pos["Farhan"]) == 1:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_2 = seat_to_person[2]
    # Options: 1=Farhan, 2=Gauri, 3=Hari, 4=Isha
    item_option_map = {"Farhan": 1, "Gauri": 2, "Hari": 3, "Isha": 4}
    return {"value": item_option_map[person_at_2], "option_key": item_option_map[person_at_2]}

if __name__ == "__main__":
    print(solve())
