from itertools import product


def solve():
    people = ["A", "B", "C", "D", "E"]
    valid = []
    for g in product("MF", repeat=len(people)):
        gen = dict(zip(people, g))
        # B is the only brother of C => B male
        if gen["B"] != "M":
            continue
        # C is the only daughter of A => C female
        if gen["C"] != "F":
            continue
        # C married to D => opposite genders
        if gen["C"] == gen["D"]:
            continue
        valid.append(gen)
    assert len(valid) > 0
    # D's gender must be forced to male in every consistent filling
    assert all(s["D"] == "M" for s in valid), "D must be uniquely male"

    # Maternal grandmother of E: E's mother is C, C's mother is A => A.
    maternal_grandmother = "A"
    # D is husband of C, C is daughter of A => D is son-in-law of A; D male.
    relation = "Son-in-law"
    assert maternal_grandmother == "A"
    option_for = {
        "Son-in-law": 1,
        "Son": 2,
        "Brother-in-law": 3,
        "Daughter-in-law": 4,
    }
    return {"value": relation, "option_key": option_for[relation]}


if __name__ == "__main__":
    print(solve())
