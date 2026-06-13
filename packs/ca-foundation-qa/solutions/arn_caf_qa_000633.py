def solve():
    # Six persons: Anand, Beena, Charan, Deepti, Farida, Gopal at seats 1-6 (clockwise circular)
    # Anand=1, Deepti opposite Anand (=4), Charan imm CW from Anand (=2), Farida imm CW from Deepti (=5)
    # Beena opposite Gopal, Gopal not adjacent to Charan
    # Find: who is immediately to the right of Anand (facing centre = CCW neighbor)
    from itertools import permutations

    persons = ["Anand", "Beena", "Charan", "Deepti", "Farida", "Gopal"]
    n = 6
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Anand"] != 1:
            continue
        if pos["Deepti"] != 4:
            continue
        if pos["Charan"] != 2:
            continue
        if pos["Farida"] != 5:
            continue
        # Beena opposite Gopal (differ by 3)
        if abs(pos["Beena"] - pos["Gopal"]) != 3:
            continue
        # Gopal not adjacent to Charan
        charan_s = pos["Charan"]
        gopal_s = pos["Gopal"]
        dist = min(abs(charan_s - gopal_s), n - abs(charan_s - gopal_s))
        if dist == 1:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    anand_s = pos["Anand"]
    # Right of Anand facing centre = CCW neighbor = (anand_s - 2) % n + 1
    right_seat = (anand_s - 2) % n + 1
    right_person = seat_to_person[right_seat]
    # Options: 1=Beena, 2=Charan, 3=Farida, 4=Gopal
    item_option_map = {"Beena": 1, "Charan": 2, "Farida": 3, "Gopal": 4}
    return {"value": item_option_map[right_person], "option_key": item_option_map[right_person]}

if __name__ == "__main__":
    print(solve())
