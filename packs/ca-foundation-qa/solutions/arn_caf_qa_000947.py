from itertools import product


def solve():
    # People whose gender is unknown a priori. R is the only son (male).
    people = ["P", "Q", "R", "S", "T", "U", "V"]
    valid = []
    for g in product("MF", repeat=len(people)):
        gen = dict(zip(people, g))
        # R is the only son => male
        if gen["R"] != "M":
            continue
        # P and Q are a married couple => opposite genders
        if gen["P"] == gen["Q"]:
            continue
        # Q is the brother of V => Q male
        if gen["Q"] != "M":
            continue
        # R (male) is married to T => T female
        if gen["T"] != "F":
            continue
        valid.append(gen)
    assert len(valid) > 0
    # P's gender must be forced to female across every consistent filling
    assert all(s["P"] == "F" for s in valid), "P must be uniquely female"

    # Grandmother of U: U child of R,T; R child of P,Q; female parent of R = P.
    grandmother = "P"
    # Relation of P to V: P is wife of Q, V is brother of Q => P is spouse of V's sibling.
    # P is female => sister-in-law.
    relation = "Sister-in-law"
    assert grandmother == "P"
    option_for = {
        "Sister-in-law": 1,
        "Mother-in-law": 2,
        "Sister": 3,
        "Aunt": 4,
    }
    return {"value": relation, "option_key": option_for[relation]}


if __name__ == "__main__":
    print(solve())
