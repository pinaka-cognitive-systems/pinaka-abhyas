def solve():
    # Five persons: Manu, Nita, Ojas, Pooja, Ravi at seats 1-5 (clockwise circular)
    # Manu=1, Ojas=2 (imm CW from Manu)
    # Nita 2 seats CCW from Ravi: Nita = ((Ravi - 3) % 5) + 1
    # Pooja not adjacent to Ojas
    # Find: who is immediately to the right of Pooja (facing centre = CCW neighbor)
    from itertools import permutations

    persons = ["Manu", "Nita", "Ojas", "Pooja", "Ravi"]
    n = 5
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Manu"] != 1:
            continue
        if pos["Ojas"] != 2:
            continue
        # Nita 2 seats CCW from Ravi
        ravi_s = pos["Ravi"]
        nita_expected = ((ravi_s - 3) % n) + 1
        if pos["Nita"] != nita_expected:
            continue
        # Pooja not adjacent to Ojas
        pooja_s = pos["Pooja"]
        ojas_s = pos["Ojas"]
        dist = min(abs(pooja_s - ojas_s), n - abs(pooja_s - ojas_s))
        if dist == 1:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    pooja_s = pos["Pooja"]
    # Right of Pooja facing centre = CCW neighbor = seat (pooja_s - 2) % n + 1
    right_seat = (pooja_s - 2) % n + 1
    right_person = seat_to_person[right_seat]
    # Options: 1=Manu, 2=Nita, 3=Ojas, 4=Ravi
    item_option_map = {"Manu": 1, "Nita": 2, "Ojas": 3, "Ravi": 4}
    return {"value": item_option_map[right_person], "option_key": item_option_map[right_person]}

if __name__ == "__main__":
    print(solve())
