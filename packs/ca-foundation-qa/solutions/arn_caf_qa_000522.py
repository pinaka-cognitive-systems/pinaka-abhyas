def solve():
    A = {1, 2, 3, 4}
    R = {(1, 2), (2, 1), (2, 3), (3, 2), (1, 3), (3, 1)}

    # Check reflexive
    reflexive = all((a, a) in R for a in A)

    # Check symmetric
    symmetric = all((b, a) in R for (a, b) in R)

    # Check transitive
    transitive = True
    for (a, b) in R:
        for (b2, c) in R:
            if b == b2:
                if (a, c) not in R:
                    transitive = False
                    break
        if not transitive:
            break

    assert not reflexive
    assert symmetric
    assert not transitive
    # Symmetric but neither reflexive nor transitive -> option 1
    return {"value": "symmetric_only", "option_key": 1}

if __name__ == "__main__":
    print(solve())
