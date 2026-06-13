def solve():
    # Relation R = {(1,1),(2,2),(3,3)} on set {1,2,3}
    S = {1, 2, 3}
    R = {(1, 1), (2, 2), (3, 3)}

    # Check reflexive
    reflexive = all((a, a) in R for a in S)

    # Check symmetric
    symmetric = all((b, a) in R for (a, b) in R)

    # Check transitive
    transitive = all(
        (a, c) in R
        for (a, b1) in R
        for (b2, c) in R
        if b1 == b2
    )

    # All three hold -> equivalence relation -> option 3
    assert reflexive and symmetric and transitive
    return {"value": 3, "option_key": 3}

if __name__ == "__main__":
    print(solve())
