def solve():
    # 4 persons around circular table, seats 1-4 clockwise, facing centre
    # Priya opp Raj, Suman imm CW from Priya
    # Find: immediate left of Raj (facing centre = CW direction)
    # Seats are numbered 1-4 CW so fix Priya=1 to eliminate rotational equivalence
    from itertools import permutations

    persons = ["Priya", "Qazi", "Raj", "Suman"]
    n = 4
    # Fix Priya at seat 1 (rotational anchor for circular arrangement)
    # Priya directly opposite Raj: |Raj - 1| = 2, so Raj = 3
    # Suman immediately CW from Priya: Suman = (1 % 4) + 1 = 2
    # Qazi = remaining seat = 4
    pos = {"Priya": 1, "Raj": 3, "Suman": 2, "Qazi": 4}
    seat_to_person = {v: k for k, v in pos.items()}

    # Verify all clues
    assert abs(pos["Priya"] - pos["Raj"]) == n // 2, "Priya not opposite Raj"
    assert pos["Suman"] == (pos["Priya"] % n) + 1, "Suman not imm CW from Priya"

    # Immediate left of Raj (facing centre): left = CW direction = (Raj_seat % n) + 1
    raj_seat = pos["Raj"]
    left_seat = (raj_seat % n) + 1
    left_person = seat_to_person[left_seat]
    # Options: 1=Priya, 2=Qazi, 3=Raj, 4=Suman
    item_option_map = {"Priya": 1, "Qazi": 2, "Raj": 3, "Suman": 4}
    return {"value": item_option_map[left_person], "option_key": item_option_map[left_person]}

if __name__ == "__main__":
    print(solve())
