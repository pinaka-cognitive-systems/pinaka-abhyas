from itertools import product


def solve():
    people = ["K", "L", "M", "N", "O", "P"]
    valid = []
    for g in product("MF", repeat=len(people)):
        gen = dict(zip(people, g))
        # K and L are a married couple => opposite genders
        if gen["K"] == gen["L"]:
            continue
        # M is the only sister of N => M female
        if gen["M"] != "F":
            continue
        # N married to O => opposite genders
        if gen["N"] == gen["O"]:
            continue
        # O is the daughter-in-law of K => O female
        if gen["O"] != "F":
            continue
        valid.append(gen)
    assert len(valid) > 0
    # N's gender must be forced to male in every consistent filling
    assert all(s["N"] == "M" for s in valid), "N must be uniquely male"

    # P is the son of N and O => N is P's father.
    # M is the sister of N (P's father) and M is female => M is P's paternal aunt.
    relation = "Aunt"
    option_for = {"Aunt": 1, "Mother": 2, "Sister": 3, "Niece": 4}
    return {"value": relation, "option_key": option_for[relation]}


if __name__ == "__main__":
    print(solve())
