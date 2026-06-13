def solve():
    # Eight persons: Aryan, Bhavna, Chirag, Divya, Eshaan, Farida, Gaurav, Hema
    # Seats 1-8 clockwise around circular table
    # Clue 1: Aryan=1
    # Clue 2: Bhavna 3 seats CW from Aryan -> Bhavna=4
    # Clue 3: Chirag 2 seats CW from Aryan -> Chirag=3
    # Clue 4: Divya directly opposite Aryan -> Divya=5
    # Clue 5: Eshaan directly opposite Bhavna -> Eshaan=8
    # Clue 6: Farida directly opposite Chirag -> Farida=7
    # Clue 7: Gaurav imm CW from Divya -> Gaurav=6
    # Hema fills remaining seat -> Hema=2
    # Find: who is at seat 2?
    from itertools import permutations

    persons = ["Aryan", "Bhavna", "Chirag", "Divya", "Eshaan", "Farida", "Gaurav", "Hema"]
    n = 8
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Aryan"] != 1:
            continue
        # Bhavna 3 seats CW from Aryan (2 people between them CW)
        if pos["Bhavna"] != 4:
            continue
        # Chirag 2 seats CW from Aryan
        if pos["Chirag"] != 3:
            continue
        # Divya opposite Aryan
        if pos["Divya"] != 5:
            continue
        # Eshaan opposite Bhavna
        if pos["Eshaan"] != 8:
            continue
        # Farida opposite Chirag
        if pos["Farida"] != 7:
            continue
        # Gaurav imm CW from Divya
        if pos["Gaurav"] != 6:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_2 = seat_to_person[2]
    # Options: 1=Bhavna, 2=Gaurav, 3=Hema, 4=Chirag
    item_option_map = {"Bhavna": 1, "Gaurav": 2, "Hema": 3, "Chirag": 4}
    return {"value": item_option_map[person_at_2], "option_key": item_option_map[person_at_2]}

if __name__ == "__main__":
    print(solve())
