def solve():
    # Coded-relation operators. In "X s Y" the symbol s tells how X is related
    # to Y:
    #   +  X is the father of Y
    #   -  X is the sister of Y
    #   *  X is the son of Y
    #   /  X is the mother of Y
    # Read the chain P / Q + R - S and find how P is related to S.
    #
    # We model parent edges and genders, then derive the relation by walking
    # the tree, asserting the derivation is forced.

    # Pinned genders from the operators applied to each left operand:
    #   P / Q : P is the mother of Q  -> P female; P parent of Q
    #   Q + R : Q is the father of R  -> Q male;   Q parent of R
    #   R - S : R is the sister of S  -> R female; R, S same parents
    gender = {"P": "F", "Q": "M", "R": "F"}
    parents = {
        "P": set(),
        "Q": {"P"},        # P mother of Q
        "R": {"Q"},        # Q father of R
        "S": {"Q"},        # R sister of S -> S shares R's parent(s); R's parent is Q
    }
    # S's gender is unknown and not needed: P relates to S via generations.

    # Walk from S up to P:
    cur = {"S"}
    steps = 0
    while cur and steps < 5:
        if "P" in cur:
            break
        nxt = set()
        for x in cur:
            nxt |= parents[x]
        cur = nxt
        steps += 1
    assert steps == 2, f"P should be 2 generations above S, got {steps}"

    # P is 2 generations above S and P is female -> P is the grandmother of S.
    relation = "grandmother" if gender["P"] == "F" else "grandfather"

    answer = relation
    options = {1: "grandmother", 2: "mother", 3: "grandfather", 4: "aunt"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
