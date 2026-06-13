def solve():
    # Five persons: Anil, Bina, Charu, Deepak, Esha in positions 1-5
    # Bina=5, Deepak at end (1 or 5, Bina=5 so Deepak=1)
    # Anil immediately left of Charu (AC block)
    # Esha not adjacent to Bina
    # Find: who is at position 3?
    from itertools import permutations

    persons = ["Anil", "Bina", "Charu", "Deepak", "Esha"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Bina"] != 5:
            continue
        if pos["Deepak"] not in (1, 5):
            continue
        if pos["Charu"] != pos["Anil"] + 1:
            continue
        if abs(pos["Esha"] - pos["Bina"]) == 1:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_3 = seat_to_person[3]
    option_map = {"Anil": 1, "Bina": 2, "Charu": 3, "Deepak": 4, "Esha": 5}
    # Options in item: 1=Anil, 2=Bina, 3=Charu, 4=Deepak
    item_option_map = {"Anil": 1, "Bina": 2, "Charu": 3, "Deepak": 4}
    return {"value": item_option_map[person_at_3], "option_key": item_option_map[person_at_3]}

if __name__ == "__main__":
    print(solve())
