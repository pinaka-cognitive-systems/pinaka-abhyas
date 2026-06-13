from itertools import product


def solve():
    # Family of six people: P, Q, R, S, T, U.
    # Premises (the gender of T is never stated directly; it must be inferred):
    #  P1: P is the father of Q.
    #  P2: Q is the brother of R.
    #  P3: R is the mother of S.
    #  P4: S is the brother of T.
    #  P5: U is the wife of P.
    #  P6: T is the only child of R who is married, and T's spouse is male.
    # Query: how is T related to P (T's grandfather)?  The label needs T's
    # gender, which P6 forces: T has a male spouse, so T is female ->
    # granddaughter.
    #
    # We ENUMERATE every gender assignment to the people whose gender is not
    # literally stated by a "father/mother/brother/son/daughter/wife" word,
    # apply all premises, and assert exactly one assignment survives.

    people = ["P", "Q", "R", "S", "T", "U"]

    # Parent edges fixed by the premises (independent of gender enumeration):
    #  P father of Q, U wife of P -> Q child of P and U.
    #  Q brother of R -> R child of P and U (same parents).
    #  R mother of S -> S child of R.
    #  S brother of T -> T child of R (same parents).
    parents = {
        "P": set(),
        "U": set(),
        "Q": {"P", "U"},
        "R": {"P", "U"},
        "S": {"R"},
        "T": {"R"},
    }

    # Genders literally pinned by relation words:
    #  P father -> M; Q brother -> M; R mother -> F; S brother -> M; U wife -> F.
    pinned = {"P": "M", "Q": "M", "R": "F", "S": "M", "U": "F"}

    def consistent(gender):
        # Re-check the literal premises.
        if gender["P"] != "M":   # father
            return False
        if gender["Q"] != "M":   # brother
            return False
        if gender["R"] != "F":   # mother
            return False
        if gender["S"] != "M":   # brother
            return False
        if gender["U"] != "F":   # wife
            return False
        # P6: T is married and T's spouse is male. In this family model a
        # marriage is heterosexual, so a male spouse forces T to be female.
        if gender["T"] != "F":
            return False
        return True

    solutions = []
    for g_combo in product("MF", repeat=len(people)):
        gender = dict(zip(people, g_combo))
        if consistent(gender):
            solutions.append(gender)

    assert len(solutions) == 1, f"expected unique gender solution, got {len(solutions)}"
    gender = solutions[0]

    # Relation of T to P: walk generations up from T.
    cur = {"T"}
    steps = 0
    while cur and steps < 5:
        if "P" in cur:
            break
        nxt = set()
        for x in cur:
            nxt |= parents[x]
        cur = nxt
        steps += 1
    assert steps == 2, f"P should be 2 generations above T, got {steps}"

    # P is 2 generations above T; T is female -> T is the granddaughter of P.
    relation = "granddaughter" if gender["T"] == "F" else "grandson"

    answer = relation
    options = {1: "grandson", 2: "granddaughter", 3: "daughter", 4: "niece"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
