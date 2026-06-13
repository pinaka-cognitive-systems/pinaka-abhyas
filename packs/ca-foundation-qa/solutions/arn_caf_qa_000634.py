def solve():
    # Five persons: Rahul, Shreya, Tarun, Uma, Vijay in positions 1-5
    # Tarun = Rahul + 3 (exactly 3 right of Rahul)
    # Uma immediately left of Vijay (Vijay = Uma + 1)
    # Vijay not at position 5
    # Rahul not at position 2
    # Find: who is at position 3?
    from itertools import permutations

    persons = ["Rahul", "Shreya", "Tarun", "Uma", "Vijay"]
    valid = []
    for perm in permutations(persons):
        pos = {p: i+1 for i, p in enumerate(perm)}
        if pos["Tarun"] != pos["Rahul"] + 3:
            continue
        if pos["Vijay"] != pos["Uma"] + 1:
            continue
        if pos["Vijay"] == 5:
            continue
        if pos["Rahul"] == 2:
            continue
        valid.append(pos)

    assert len(valid) == 1, f"Expected 1 arrangement, got {len(valid)}: {valid}"
    pos = valid[0]
    seat_to_person = {v: k for k, v in pos.items()}
    person_at_3 = seat_to_person[3]
    # Options: 1=Rahul, 2=Shreya, 3=Uma, 4=Vijay
    item_option_map = {"Rahul": 1, "Shreya": 2, "Uma": 3, "Vijay": 4}
    return {"value": item_option_map[person_at_3], "option_key": item_option_map[person_at_3]}

if __name__ == "__main__":
    print(solve())
